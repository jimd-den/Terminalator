/**
 * HeadCommand - Core Command
 *
 * Output the first part of files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to view the beginning of files.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

interface HeadOptions {
    lines?: number;
    bytes?: number;
    mode: 'lines' | 'bytes';
}

export class HeadCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const parseResult = this.parseArgs(args);

        if (parseResult.error) {
            return {
                output: parseResult.error,
                newState: state,
                exitCode: 1
            };
        }

        const { options, files } = parseResult;
        let output = '';
        let exitCode = 0;

        const effectiveFiles = files.length > 0 ? files : ['-'];

        for (let i = 0; i < effectiveFiles.length; i++) {
            const filename = effectiveFiles[i];

            // Print header if multiple files are processed
            if (effectiveFiles.length > 1) {
                if (output.length > 0) output += '\n'; // Separate by blank line
                output += `==> ${filename} <==\n`;
            }

            try {
                let content: Buffer | string;
                if (filename === '-') {
                    content = context.stdin || '';
                } else {
                    const path = this.resolvePath(filename, state);
                    if (!this.fs.exists(path)) {
                        output += `head: cannot open '${filename}' for reading: No such file or directory`;
                        exitCode = 1;
                        continue;
                    }
                    if (this.fs.isDirectory(this.fs.resolve(path)!)) {
                         output += `head: error reading '${filename}': Is a directory`;
                         // Standard head continues? Or fails? POSIX "Default" error consequences.
                         // Usually prints error to stderr and continues.
                         // But for test compliance check exit code.
                         exitCode = 1;
                         continue;
                    }
                    content = this.fs.readFileBuffer(path);
                }

                output += this.extractHead(content, options);

            } catch (error: any) {
                output += `head: cannot open '${filename}' for reading: ${error.message}`;
                exitCode = 1;
            }
        }

        return {
            output: output,
            newState: state,
            exitCode: exitCode
        };
    }

    private parseArgs(args: string[]): { options: HeadOptions, files: string[], error?: string } {
        let options: HeadOptions = {
            lines: 10,
            mode: 'lines'
        };
        const files: string[] = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            if (arg === '-n') {
                if (i + 1 >= args.length) {
                    return { options, files, error: 'head: option requires an argument -- n' };
                }
                const val = parseInt(args[i + 1]);
                if (isNaN(val) || val < 0) {
                     // POSIX requires positive decimal integer. 0 is allowed.
                     // But parseInt might return NaN.
                     return { options, files, error: `head: invalid number of lines: '${args[i+1]}'` };
                }
                options.lines = val;
                options.mode = 'lines';
                options.bytes = undefined; // override
                i++; // skip value
            } else if (arg === '-c') {
                if (i + 1 >= args.length) {
                    return { options, files, error: 'head: option requires an argument -- c' };
                }
                const val = parseInt(args[i + 1]);
                if (isNaN(val) || val < 0) {
                     return { options, files, error: `head: invalid number of bytes: '${args[i+1]}'` };
                }
                options.bytes = val;
                options.mode = 'bytes';
                options.lines = undefined; // override
                i++;
            } else if (arg.startsWith('-') && arg !== '-') {
                // handle bundled like -n10 ? POSIX says -n number.
                // Assuming arguments are split.
                return { options, files, error: `head: invalid option -- ${arg}` };
            } else {
                files.push(arg);
            }
        }

        return { options, files };
    }

    private extractHead(content: string | Buffer, options: HeadOptions): string {
        if (options.mode === 'bytes' && options.bytes !== undefined) {
            // Handle bytes
            let buffer: Uint8Array;
            if (typeof content === 'string') {
                buffer = new TextEncoder().encode(content);
            } else {
                buffer = new Uint8Array(content); // Buffer to Uint8Array
            }

            const slice = buffer.slice(0, options.bytes);
            return new TextDecoder().decode(slice);
        } else {
            // Handle lines
            const text = typeof content === 'string' ? content : new TextDecoder().decode(content);
            const lines = text.split('\n');

            // split includes a trailing empty string if ends with newline.
            // head -n 10 of "a\nb\n" should be "a\nb\n".
            // lines array: ["a", "b", ""] length 3.
            // slice(0, 10) -> ["a", "b", ""].
            // join('\n') -> "a\nb\n".
            // Correct.

            // Special case: if file has no trailing newline, behavior is preserved.
            // "a\nb" -> ["a", "b"] -> join -> "a\nb".

            // However, verify if lines limit is exceeded.
            // head -n 1 of "a\nb\n" -> lines.slice(0,1) -> ["a"]. join -> "a".
            // Should be "a\n".

            // Let's refine. We want the first N lines.
            // A "line" usually includes the delimiter in `head` context?
            // "Copying shall end at the point...".
            // If I split by `\n`, I lose the delimiters.
            // Simple approach: find the index of the Nth newline.

            if (options.lines === 0) return '';

            let count = 0;
            let index = -1;

            for (let i = 0; i < text.length; i++) {
                if (text[i] === '\n') {
                    count++;
                    if (count === options.lines) {
                        index = i;
                        break;
                    }
                }
            }

            if (index !== -1) {
                return text.substring(0, index + 1); // include the Nth newline
            } else {
                // Fewer lines than requested, return all
                return text;
            }
        }
    }

    private resolvePath(filename: string, state: TerminalState): string {
        if (filename.startsWith('/')) {
            return filename;
        }
        return state.currentDirectory === '/' ? `/${filename}` : `${state.currentDirectory}/${filename}`;
    }
}
