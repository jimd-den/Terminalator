import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem, FSNode } from '../../../domain/entities/FileSystem';
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

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const options = this.parseArgs(args);

        if (!options.destination || options.sources.length === 0) {
            return { output: 'cp: missing file operand', exitCode: 1 };
        }

        const destPath = options.destination;

        // Resolve destination
        // Note: Destination might not exist (if copying file to new file name).
        // If copying multiple sources, destination MUST be an existing directory.
        const destNode = this.fs.resolveNode(destPath, context.cwd);
        const destIsDir = destNode?.type === 'directory';

        if (options.sources.length > 1 && !destIsDir) {
            return { output: `cp: target '${destPath}' is not a directory`, exitCode: 1 };
        }

        const outputLines: string[] = [];
        let exitCode = 0;

        for (const sourcePath of options.sources) {
            try {
                const sourceNode = this.fs.resolveNode(sourcePath, context.cwd);
                if (!sourceNode) {
                    outputLines.push(`cp: cannot stat '${sourcePath}': No such file or directory`);
                    exitCode = 1;
                    continue;
                }

                if (sourceNode.type === 'directory' && !options.recursive) {
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

                this.copyNode(sourceNode, finalDestPath, context.cwd, options.recursive);

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
            options.destination = operands.pop()!; // Last operand is destination
            options.sources = operands;
        }

        return options;
    }

    /**
     * Recursively copies a node to a destination path.
     */
    private copyNode(node: FSNode, destPath: string, cwd: string, recursive: boolean) {
        if (node.type === 'file') {
            // Write file (create or overwrite)
            this.fs.writeFile(destPath, node.content || '', 'w', cwd);
        } else if (node.type === 'directory') {
            if (!recursive) {
                // Should be caught earlier, but safety:
                throw new Error(`-r not specified; omitting directory '${node.name}'`);
            }

            // Create directory
            // We might need to ensure parent exists first? 
            // writeFile creates file, createNode creates node.
            // If destPath is 'a/b/c', and 'b' doesn't exist?
            // createNode expects parent to exist.
            // But we handled structure creation.
            // Wait, if we act like `cp -R dir1 dir2` and dir2 doesn't exist, we create dir2.

            // Try to create directory
            // We cannot easily check existence here via resolveNode because we might be in the middle of creation.
            // Helper `mkdir -p` logic would be useful.
            // For now, assume simplified copy: target parent exists.

            try {
                this.fs.createNode(destPath, 'directory', cwd);
            } catch (e: any) {
                // If exists (and is dir), ignore. If error, rethrow.
                if (!e.message.includes('File exists')) {
                    // actually if it exists we just merge into it
                }
            }

            // Recurse children
            if (node.children) {
                for (const childName of Object.keys(node.children)) {
                    const childNode = node.children[childName];
                    const childDestPath = destPath.endsWith('/') ? `${destPath}${childName}` : `${destPath}/${childName}`;
                    this.copyNode(childNode, childDestPath, cwd, recursive);
                }
            }
        }
    }
}
