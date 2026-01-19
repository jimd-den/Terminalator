/**
 * CutCommand - Core Command
 *
 * Cut out selected fields of each line of a file.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to extract sections from each line of input.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

interface CutOptions {
    bytes?: string;
    chars?: string;
    fields?: string;
    delimiter: string;
    files: string[];
}

export class CutCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const options: CutOptions = {
            delimiter: '\t',
            files: []
        };

        // Argument Parsing
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === '-b') {
                options.bytes = args[++i];
            } else if (arg === '-c') {
                options.chars = args[++i];
            } else if (arg === '-f') {
                options.fields = args[++i];
            } else if (arg === '-d') {
                options.delimiter = args[++i];
                // Handle quoted delimiter removal if necessary, shell parser might handle it
                if (options.delimiter.startsWith('"') && options.delimiter.endsWith('"')) {
                    options.delimiter = options.delimiter.slice(1, -1);
                }
            } else if (!arg.startsWith('-')) {
                options.files.push(arg);
            }
        }

        // Validation
        if (!options.bytes && !options.chars && !options.fields) {
            return {
                output: 'cut: you must specify a list of bytes, characters, or fields',
                newState: state,
                exitCode: 1
            };
        }

        if ((options.bytes && options.fields) || (options.chars && options.fields)) {
            return {
                output: 'cut: only one type of list may be specified',
                newState: state,
                exitCode: 1
            };
        }

        let inputContent = '';
        if (options.files.length > 0) {
            // Read from files
            for (const file of options.files) {
                try {
                    const resolvedPath = this.resolvePath(file, state);
                    const node = this.fs.resolveNode(resolvedPath);
                    if (!node) throw new Error();
                    inputContent += this.fs.readFile(resolvedPath);
                } catch (e) {
                    return {
                        output: `cut: ${file}: No such file or directory`,
                        newState: state,
                        exitCode: 1
                    };
                }
            }
        } else if (input !== undefined) {
            inputContent = input;
        } else {
             // In a real shell, this would wait for stdin. Here we fail or return empty.
             return { output: '', newState: state, exitCode: 0 };
        }

        const lines = inputContent.split('\n');
        const results: string[] = [];

        // Processing
        for (const line of lines) {
            if (line === '') {
                results.push('');
                continue;
            }

            if (options.fields) {
                results.push(this.processFields(line, options.fields, options.delimiter));
            } else {
                const list = options.bytes || options.chars;
                if (list) {
                    results.push(this.processBytes(line, list));
                }
            }
        }

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

    private processBytes(line: string, listStr: string): string {
        const ranges = this.parseRanges(listStr);
        let result = '';
        // 1-based indexing for cut
        for (let i = 1; i <= line.length; i++) {
            if (this.isInRanges(i, ranges)) {
                result += line[i - 1];
            }
        }
        return result;
    }

    private processFields(line: string, listStr: string, delimiter: string): string {
        // If line contains no delimiter, output verbatim unless -s is used (not implemented yet)
        if (!line.includes(delimiter)) return line;

        const fields = line.split(delimiter);
        const ranges = this.parseRanges(listStr);
        const selected: string[] = [];

        for (let i = 1; i <= fields.length; i++) {
            if (this.isInRanges(i, ranges)) {
                selected.push(fields[i - 1]);
            }
        }
        return selected.join(delimiter);
    }

    private parseRanges(listStr: string): { start: number, end: number }[] {
        const parts = listStr.split(',');
        const ranges: { start: number, end: number }[] = [];

        for (const part of parts) {
            if (part.includes('-')) {
                const [s, e] = part.split('-');
                const start = s ? parseInt(s, 10) : 1;
                const end = e ? parseInt(e, 10) : Infinity;
                ranges.push({ start, end });
            } else {
                const val = parseInt(part, 10);
                ranges.push({ start: val, end: val });
            }
        }
        return ranges;
    }

    private isInRanges(index: number, ranges: { start: number, end: number }[]): boolean {
        for (const r of ranges) {
            if (index >= r.start && index <= r.end) return true;
        }
        return false;
    }
}
