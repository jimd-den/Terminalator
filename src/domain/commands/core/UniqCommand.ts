/**
 * UniqCommand - Core Command
 *
 * Report or omit repeated lines.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Filters adjacent matching lines from input.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

interface UniqOptions {
    count: boolean;
    repeated: boolean;
    unique: boolean;
    file?: string;
}

export class UniqCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const options: UniqOptions = {
            count: false,
            repeated: false,
            unique: false
        };

        // Argument Parsing
        for (const arg of args) {
            if (arg === '-c') options.count = true;
            else if (arg === '-d') options.repeated = true;
            else if (arg === '-u') options.unique = true;
            else if (!arg.startsWith('-')) {
                // If input file not set, set it.
                // POSIX uniq takes [input [output]]
                if (!options.file) options.file = arg;
                // Output file not supported in this simplified version yet
            }
        }

        let content = '';
        if (options.file) {
            try {
                const resolvedPath = this.resolvePath(options.file, state);
                content = this.fs.readFile(resolvedPath);
            } catch (e) {
                return {
                    output: `uniq: ${options.file}: No such file or directory`,
                    newState: state,
                    exitCode: 1
                };
            }
        } else if (input !== undefined) {
            content = input;
        } else {
             // In real shell, wait for stdin.
             return { output: '', newState: state, exitCode: 0 };
        }

        const lines = content.split('\n');
        // Handle trailing newline splitting resulting in empty string at end?
        // Usually split gives ["line", "line", ""] if ends with \n.
        // POSIX uniq operates on lines.
        // We will process all elements.

        const results: string[] = [];
        let previousLine: string | null = null;
        let count = 0;

        const flush = () => {
            if (previousLine !== null) {
                const isRepeated = count > 1;
                // Selection logic
                // Default: print all (collapsed)
                // -d: print only if repeated
                // -u: print only if NOT repeated (count == 1)
                // -c: prefix with count

                // If both -d and -u are present? POSIX says "Output lines that are repeated ... and lines that are not repeated". So logical OR?
                // Actually usually strict flags override.
                // BSD man page: "-u: Only output lines that are not repeated." "-d: Only output lines that are repeated."
                // If both: usually prints nothing or both?
                // Let's assume they act as filters. If neither, print all.

                let shouldPrint = true;
                if (options.repeated && !isRepeated) shouldPrint = false;
                if (options.unique && isRepeated) shouldPrint = false;

                if (shouldPrint) {
                    let lineOut = previousLine;
                    if (options.count) {
                        // "   1 line"
                        lineOut = `${count.toString().padStart(4)} ${lineOut}`;
                    }
                    results.push(lineOut);
                }
            }
        };

        for (const line of lines) {
            // uniq works on adjacent lines
            if (line !== previousLine) {
                flush();
                previousLine = line;
                count = 1;
            } else {
                count++;
            }
        }
        flush();

        return {
            output: results.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
