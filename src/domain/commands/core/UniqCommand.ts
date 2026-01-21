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
import { FileSystemService } from '../../services/FileSystemService';

interface UniqOptions {
    count: boolean;
    repeated: boolean;
    unique: boolean;
    skipFields: number;
    skipChars: number;
    ignoreCase: boolean;
    inputFile?: string;
    outputFile?: string;
}

export class UniqCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const options: UniqOptions = {
            count: false,
            repeated: false,
            unique: false,
            skipFields: 0,
            skipChars: 0,
            ignoreCase: false
        };

        const operands: string[] = [];
        let skipNext = false;

        for (let i = 0; i < args.length; i++) {
            if (skipNext) {
                skipNext = false;
                continue;
            }
            const arg = args[i];
            if (arg === '-c') options.count = true;
            else if (arg === '-d') options.repeated = true;
            else if (arg === '-u') options.unique = true;
            else if (arg === '-i') options.ignoreCase = true;
            else if (arg === '-f') {
                if (i + 1 < args.length) {
                    options.skipFields = parseInt(args[i + 1]) || 0;
                    skipNext = true;
                }
            }
            else if (arg === '-s') {
                if (i + 1 < args.length) {
                    options.skipChars = parseInt(args[i + 1]) || 0;
                    skipNext = true;
                }
            }
            else if (!arg.startsWith('-')) {
                operands.push(arg);
            }
        }

        if (operands.length > 0) options.inputFile = operands[0];
        if (operands.length > 1) options.outputFile = operands[1];

        let content = '';
        if (options.inputFile && options.inputFile !== '-') {
            try {
                const resolvedPath = this.resolvePath(options.inputFile, state);
                content = this.fs.readFile(resolvedPath);
            } catch (e) {
                return {
                    output: `uniq: ${options.inputFile}: No such file or directory`,
                    newState: state,
                    exitCode: 1
                };
            }
        } else if (input !== undefined) {
            content = input;
        } else {
            return { output: '', newState: state, exitCode: 0 };
        }

        const lines = content.split('\n');
        // Handle trailing newline splitting resulting in empty string at end
        if (content.endsWith('\n') && lines[lines.length - 1] === '') {
            lines.pop();
        }

        const results: string[] = [];
        let previousLine: string | null = null;
        let count = 0;

        const getCompareKey = (line: string): string => {
            let key = line;
            if (options.skipFields > 0) {
                const parts = key.split(/\s+/);
                // If line starts with spaces, split might have empty first element?
                // Uniq fields are separated by whitespace.
                // Standard uniq skips N fields.
                // "field1   field2" -> split -> ["field1", "field2"] (if trimmed or split properly)
                // We'll use a simpler approach: finding Nth whitespace sequence.
                // Or simply removing first N whitespace-delimited words.

                // Match field+space N times
                // Regex for field: \S+\s+
                // But uniq fields include the separator?
                // "Skip N fields".
                let remaining = line;
                for (let f = 0; f < options.skipFields; f++) {
                    // Skip leading whitespace?
                    remaining = remaining.trimStart();
                    const spaceIdx = remaining.search(/\s/);
                    if (spaceIdx === -1) {
                        remaining = ""; // No more fields
                        break;
                    }
                    remaining = remaining.substring(spaceIdx);
                }
                // Also skip leading spaces after fields skipped?
                key = remaining.trimStart();
            }

            if (options.skipChars > 0) {
                if (key.length > options.skipChars) {
                    key = key.substring(options.skipChars);
                } else {
                    key = "";
                }
            }

            if (options.ignoreCase) {
                key = key.toLowerCase();
            }
            return key;
        };

        const flush = () => {
            if (previousLine !== null) {
                const isRepeated = count > 1;
                let shouldPrint = true;

                // Logic:
                // Default: Print everything (collapsed)
                // -d: Only print repeated lines
                // -u: Only print unique lines
                // If both -d and -u? standard `uniq` prints nothing usually, or implementation defined.
                // POSIX: "If -u and -d are both specified, output lines that are repeated ... and lines that are not repeated".
                // Actually no, they are mutually exclusive filters usually.
                // Let's stick to standard behavior: if flag present, filter IN.

                if (options.repeated || options.unique) {
                    shouldPrint = false;
                    if (options.repeated && isRepeated) shouldPrint = true;
                    if (options.unique && !isRepeated) shouldPrint = true;
                }

                if (shouldPrint) {
                    let lineOut = previousLine;
                    if (options.count) {
                        lineOut = `${count.toString().padStart(4)} ${lineOut}`;
                    }
                    results.push(lineOut);
                }
            }
        };

        for (const line of lines) {
            const key = getCompareKey(line);

            if (previousLine === null) {
                previousLine = line;
                count = 1;
                continue;
            }

            const prevKey = getCompareKey(previousLine);

            if (key !== prevKey) {
                flush();
                previousLine = line;
                count = 1;
            } else {
                count++;
            }
        }
        flush();

        const finalOutput = results.join('\n');

        if (options.outputFile) {
            try {
                const resolvedOut = this.resolvePath(options.outputFile, state);
                this.fs.writeFile(resolvedOut, finalOutput);
                return { output: '', newState: state, exitCode: 0 };
            } catch (e) {
                return { output: `uniq: ${options.outputFile}: Cannot write`, newState: state, exitCode: 1 };
            }
        }

        return {
            output: finalOutput,
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
