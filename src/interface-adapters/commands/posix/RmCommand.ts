import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

/**
 * RmOptions
 * 
 * Configuration for the remove operation.
 */
interface RmOptions {
    files: string[];
    recursive: boolean;       // -r, -R
    force: boolean;           // -f
    interactive: boolean;     // -i (stubbed)
    verbose: boolean;         // -v
}

/**
 * RmCommand
 * 
 * Implements the POSIX `rm` utility for removing directory entries.
 * 
 * Design:
 * - Supports multiple operands.
 * - Handles flag logic (-r for directories, -f for suppression).
 * - Utilizes FileSystem's inherent tree structure for recursive deletion.
 */
export class RmCommand implements ICommand {
    name = 'rm';
    description = 'Remove files or directories';

    constructor(private fs: FileSystem) { }

    /**
     * Executes the rm command.
     */
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const options = this.parseArgs(args);

        if (options.files.length === 0 && !options.force) {
            return { output: 'rm: missing operand', exitCode: 1 };
        }

        const outputLines: string[] = [];
        let exitCode = 0;

        for (const target of options.files) {
            try {
                // Check existence first to handle -f logic or directory check
                const node = this.fs.resolveNode(target, context.cwd);

                if (!node) {
                    if (!options.force) {
                        outputLines.push(`rm: cannot remove '${target}': No such file or directory`);
                        exitCode = 1;
                    }
                    continue;
                }

                if (node.type === 'directory' && !options.recursive) {
                    outputLines.push(`rm: cannot remove '${target}': Is a directory`);
                    exitCode = 1;
                    continue;
                }

                if (node.name === '/' || !node.parent) {
                    outputLines.push(`rm: cannot remove root directory`);
                    exitCode = 1; // Preserve system safety
                    continue;
                }

                // Execute Deletion
                // Note: interactive check would go here. keeping non-interactive for now as per architecture constraints.

                this.fs.deleteNode(target, context.cwd);

                if (options.verbose) {
                    outputLines.push(`removed '${target}'`);
                }

            } catch (e: any) {
                if (!options.force) {
                    outputLines.push(`rm: ${e.message}`);
                    exitCode = 1;
                }
            }
        }

        return {
            output: outputLines.join('\n'),
            exitCode: exitCode
        };
    }

    private parseArgs(args: string[]): RmOptions {
        const options: RmOptions = {
            files: [],
            recursive: false,
            force: false,
            interactive: false,
            verbose: false
        };

        for (const arg of args) {
            if (arg.startsWith('-') && arg.length > 1) {
                // Handle flags
                for (let j = 1; j < arg.length; j++) {
                    const char = arg[j];
                    switch (char) {
                        case 'r':
                        case 'R':
                            options.recursive = true;
                            break;
                        case 'f':
                            options.force = true;
                            break;
                        case 'i':
                            options.interactive = true;
                            break;
                        case 'v':
                            options.verbose = true;
                            break;
                        default: break;
                    }
                }
            } else {
                options.files.push(arg);
            }
        }
        return options;
    }
}

