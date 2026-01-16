import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
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

    constructor() { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const options = this.parseArgs(args);

        if (!options.destination || options.sources.length === 0) {
            return { output: 'mv: missing file operand', exitCode: 1 };
        }

        const destPath = options.destination;
        const destNode = context.fs.resolveNode(destPath, context.cwd);
        const destIsDir = destNode ? context.fs.isDirectory(destNode) : false;

        if (options.sources.length > 1 && !destIsDir) {
            return { output: `mv: target '${destPath}' is not a directory`, exitCode: 1 };
        }

        const outputLines: string[] = [];
        let exitCode = 0;

        for (const sourcePath of options.sources) {
            try {
                // Determine final destination path
                let finalDest = destPath;
                if (destIsDir) {
                    // Extract basename from source
                    let sourceName = sourcePath;
                    if (sourcePath.includes('/')) {
                        const idx = sourcePath.lastIndexOf('/');
                        sourceName = sourcePath.substring(idx + 1);
                        if (!sourceName) {
                            const prev = sourcePath.substring(0, idx);
                            sourceName = prev.substring(prev.lastIndexOf('/') + 1);
                        }
                    }

                    finalDest = destPath.endsWith('/') ? `${destPath}${sourceName}` : `${destPath}/${sourceName}`;
                }

                // Check no-clobber
                if (options.noClobber && context.fs.resolveNode(finalDest, context.cwd)) {
                    continue;
                }

                context.fs.rename(sourcePath, finalDest, context.cwd);

                if (options.verbose) {
                    outputLines.push(`renamed '${sourcePath}' -> '${finalDest}'`);
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
