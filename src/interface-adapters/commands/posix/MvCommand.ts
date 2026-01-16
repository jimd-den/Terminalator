import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem, FSNode } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

interface MvOptions {
    sources: string[];
    destination: string;
    force: boolean;       // -f
    interactive: boolean; // -i
    noClobber: boolean;   // -n
    verbose: boolean;     // -v
}

/**
 * MvCommand
 * 
 * Implements the POSIX `mv` utility for moving (renaming) files.
 * 
 * Design:
 * - Uses O(1) reparenting logic instead of copy-delete for efficiency.
 * - Supports multiple sources moving to a directory.
 * - Handles flags for overwrite control (-f, -n).
 */
export class MvCommand implements ICommand {
    name = 'mv';
    description = 'Move (rename) files';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const options = this.parseArgs(args);

        if (!options.destination || options.sources.length === 0) {
            return { output: 'mv: missing file operand', exitCode: 1 };
        }

        const destPath = options.destination;
        const destNode = this.fs.resolveNode(destPath, context.cwd);
        const destIsDir = destNode?.type === 'directory';

        if (options.sources.length > 1 && !destIsDir) {
            return { output: `mv: target '${destPath}' is not a directory`, exitCode: 1 };
        }

        const outputLines: string[] = [];
        let exitCode = 0;

        for (const sourcePath of options.sources) {
            try {
                // 1. Resolve Source
                const sourceNode = this.fs.resolveNode(sourcePath, context.cwd);
                if (!sourceNode) {
                    outputLines.push(`mv: cannot stat '${sourcePath}': No such file or directory`);
                    exitCode = 1;
                    continue;
                }

                // 2. Determine Destination Parent and Name
                let targetParentNode: FSNode | null = null;
                let targetName = '';

                if (destIsDir) {
                    // Moving into directory: Parent is destNode, name is source name
                    targetParentNode = destNode;
                    targetName = sourceNode.name;
                } else {
                    // Renaming/Moving to file path
                    // Destination might exist (destNode) or not.
                    if (destNode) {
                        // Destination exists and is a file (since !destIsDir check above handles multi-source logic)
                        // If we are here, we are moving 1 file to another existing file
                        // Overwrite check (unless different inode? we don't have inodes)
                        if (options.noClobber) {
                            continue; // Silent skip? POSIX says silent 
                        }
                        if (!options.force) {
                            // Interactive check stub
                        }

                        // We will overwrite destNode. 
                        // Implementation detail: Delete destNode then move source.
                        targetParentNode = destNode.parent;
                        targetName = destNode.name;

                        // Delete destination first to make room
                        if (targetParentNode && targetParentNode.children) {
                            delete targetParentNode.children[targetName];
                        }
                    } else {
                        // Destination does not exist.
                        // Resolve parent of destination path.
                        // We must parse destPath to find parent.
                        // Using FileSystem helper would be nice, but we can do manual split.
                        // Need strict relative/absolute parsing.
                        const absDest = this.resolveAbsolutePath(destPath, context.cwd);
                        const lastSlash = absDest.lastIndexOf('/');
                        const parentPath = absDest.substring(0, lastSlash) || '/';
                        targetName = absDest.substring(lastSlash + 1);

                        targetParentNode = this.fs.resolveNode(parentPath);
                    }
                }

                if (!targetParentNode) {
                    outputLines.push(`mv: cannot move '${sourcePath}' to '${destPath}': No such file or directory`);
                    exitCode = 1;
                    continue;
                }

                if (targetParentNode.type !== 'directory') {
                    outputLines.push(`mv: cannot overwrite non-directory '${destPath}' with directory '${sourcePath}'`); // generic error logic
                    exitCode = 1;
                    continue;
                }

                // 3. Perform Move (Reparenting)
                // Remove from old parent
                if (sourceNode.parent && sourceNode.parent.children) {
                    delete sourceNode.parent.children[sourceNode.name];
                }

                // Verify no collision (should be cleared if overwrite enabled)
                if (targetParentNode.children && targetParentNode.children[targetName]) {
                    // Collision happened (e.g. race, or logic flaw above).
                    // If we deleted destNode above, this suggests strict overwrite.
                    // If -n, we skipped.
                    // If directory collision?
                    if (targetParentNode.children[targetName].type === 'directory') {
                        // Cannot overwrite directory with file generally
                        outputLines.push(`mv: cannot overwrite directory '${targetName}'`);
                        exitCode = 1;
                        // Restore source? (We deleted it from parent!)
                        // Recovery is hard without transaction. 
                        // Re-attach source to old parent.
                        if (sourceNode.parent && sourceNode.parent.children) sourceNode.parent.children[sourceNode.name] = sourceNode;
                        continue;
                    }
                    // Force overwrite
                    // Remove collision
                    delete targetParentNode.children[targetName];
                }

                // Attach to new parent
                if (!targetParentNode.children) targetParentNode.children = {};
                targetParentNode.children[targetName] = sourceNode;
                sourceNode.parent = targetParentNode;
                sourceNode.name = targetName;
                sourceNode.updatedAt = new Date().toISOString();

                if (options.verbose) {
                    outputLines.push(`renamed '${sourcePath}' -> '${destPath}'`); // simplified output
                }

            } catch (e: any) {
                outputLines.push(`mv: ${e.message}`);
                exitCode = 1;
            }
        }

        return {
            output: outputLines.join('\n'),
            exitCode: exitCode
        };
    }

    private parseArgs(args: string[]): MvOptions {
        const options: MvOptions = {
            sources: [],
            destination: '',
            force: false,
            interactive: false,
            noClobber: false,
            verbose: false
        };

        const operands: string[] = [];

        for (const arg of args) {
            if (arg.startsWith('-') && arg.length > 1) {
                for (let j = 1; j < arg.length; j++) {
                    const char = arg[j];
                    switch (char) {
                        case 'f': options.force = true; options.interactive = false; options.noClobber = false; break;
                        case 'i': options.interactive = true; options.force = false; options.noClobber = false; break;
                        case 'n': options.noClobber = true; options.force = false; options.interactive = false; break;
                        case 'v': options.verbose = true; break;
                    }
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

    private resolveAbsolutePath(path: string, cwd: string): string {
        if (path.startsWith('/')) return path;
        // Handle relative
        if (cwd === '/') return `/${path}`;
        return `${cwd}/${path}`;
    }
}
