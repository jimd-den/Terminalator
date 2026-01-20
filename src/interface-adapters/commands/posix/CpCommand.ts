import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem, Dentry } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

interface CpOptions {
    sources: string[];
    destination: string;
    recursive: boolean; // -R, -r
    force: boolean;     // -f
}

/**
 * CpCommand
 * 
 * Implements the POSIX `cp` utility for copying files and directories.
 * 
 * Design:
 * - Uses a recursive helper `copyNode` to handle directory trees.
 * - Handles 'target is directory' vs 'target is file' ambiguity based on operands.
 */
export class CpCommand implements ICommand {
    name = 'cp';
    description = 'Copy files and directories';

    constructor() { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const options = this.parseArgs(args);

        if (!options.destination || options.sources.length === 0) {
            return { output: 'cp: missing file operand', exitCode: 1 };
        }

        const destPath = options.destination;
        const destNode = context.fs.resolveNode(destPath, context.cwd);
        const destIsDir = destNode ? context.fs.isDirectory(destNode) : false;

        if (options.sources.length > 1 && !destIsDir) {
            return { output: `cp: target '${destPath}' is not a directory`, exitCode: 1 };
        }

        const outputLines: string[] = [];
        let exitCode = 0;

        for (const sourcePath of options.sources) {
            try {
                const sourceNode = context.fs.resolveNode(sourcePath, context.cwd);
                if (!sourceNode) {
                    outputLines.push(`cp: cannot stat '${sourcePath}': No such file or directory`);
                    exitCode = 1;
                    continue;
                }

                if (context.fs.isDirectory(sourceNode) && !options.recursive) {
                    outputLines.push(`cp: -r not specified; omitting directory '${sourcePath}'`);
                    exitCode = 1;
                    continue;
                }

                // Determine final destination path
                let finalDestPath = destPath;
                if (destIsDir) {
                    // If target is dir, construct path: dest/sourceName
                    finalDestPath = destPath.endsWith('/') ? `${destPath}${sourceNode.name}` : `${destPath}/${sourceNode.name}`;
                } else if (destNode) {
                    // If target exists and is file
                    if (!options.force) {
                        // Interactive check would be here
                    }
                }

                this.copyNode(context.fs, sourceNode, finalDestPath, context.cwd, options.recursive);

            } catch (e: any) {
                outputLines.push(`cp: ${e.message}`);
                exitCode = 1;
            }
        }

        return {
            output: outputLines.join('\n'),
            exitCode: exitCode
        };
    }

    private parseArgs(args: string[]): CpOptions {
        const options: CpOptions = {
            sources: [],
            destination: '',
            recursive: false,
            force: false
        };

        const operands: string[] = [];

        for (const arg of args) {
            if (arg.startsWith('-') && arg.length > 1) {
                for (let j = 1; j < arg.length; j++) {
                    const char = arg[j];
                    if (char === 'r' || char === 'R') options.recursive = true;
                    if (char === 'f') options.force = true;
                }
            } else {
                operands.push(arg);
            }
        }

        if (operands.length > 0) {
            options.destination = operands.pop()!;
            options.sources = operands;
        }

        return options;
    }

    private copyNode(fs: FileSystem, node: Dentry, destPath: string, cwd: string, recursive: boolean) {
        if (fs.isDirectory(node)) {
            if (!recursive) {
                throw new Error(`-r not specified; omitting directory '${node.name}'`);
            }

            // Create Directory
            // We ignore "File exists" if it's a directory
            try {
                fs.mkdir(destPath, 0o755, 1000, 1000, cwd);
            } catch (e: any) {
                // If it exists and is a directory (implicit), standard cp merges.
                // Our mkdir throws if exists.
                // We should check if it exists first?
                // Or just ignore if exists.
                if (!e.message.includes('File exists')) {
                    throw e;
                }
            }

            // Recurse children
            for (const childName of node.children.keys()) {
                const childNode = node.children.get(childName)!;
                const childDestPath = destPath.endsWith('/') ? `${destPath}${childName}` : `${destPath}/${childName}`;
                this.copyNode(fs, childNode, childDestPath, cwd, recursive);
            }

        } else {
            // File
            const inode = fs.getInode(node.inodeId);
            const content = inode ? inode.content : '';
            if (content instanceof Map) {
                // Should not happen for file
            } else {
                fs.writeFile(destPath, content || '', 'w', cwd);
            }
        }
    }
}
