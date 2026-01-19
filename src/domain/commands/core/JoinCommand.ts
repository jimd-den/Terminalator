/**
 * JoinCommand - Core Command
 *
 * Join lines of two files on a common field.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Relational join on text files.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

interface JoinOptions {
    field1: number;
    field2: number;
    separator: string;
    outputFormat: string | null;
    showUnpaired1: boolean;
    showUnpaired2: boolean;
    ignoreCase: boolean;
    emptyReplace: string;
}

export class JoinCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const options: JoinOptions = {
            field1: 1,
            field2: 1,
            separator: '',
            outputFormat: null,
            showUnpaired1: false,
            showUnpaired2: false,
            ignoreCase: false,
            emptyReplace: ''
        };

        const files: string[] = [];
        let skipNext = false;

        for (let i = 0; i < args.length; i++) {
            if (skipNext) {
                skipNext = false;
                continue;
            }
            const arg = args[i];
            if (arg === '-1') {
                options.field1 = parseInt(args[++i]);
                skipNext = true;
            } else if (arg === '-2') {
                options.field2 = parseInt(args[++i]);
                skipNext = true;
            } else if (arg === '-t') {
                options.separator = args[++i];
                skipNext = true;
            } else if (arg === '-o') {
                options.outputFormat = args[++i];
                skipNext = true;
            } else if (arg === '-a') {
                const filenum = args[++i];
                if (filenum === '1') options.showUnpaired1 = true;
                if (filenum === '2') options.showUnpaired2 = true;
                skipNext = true;
            } else if (arg === '-i') {
                options.ignoreCase = true;
            } else if (arg === '-e') {
                options.emptyReplace = args[++i];
                skipNext = true;
            } else if (!arg.startsWith('-')) {
                files.push(arg);
            }
        }

        if (files.length !== 2) {
             return { output: 'join: missing operand', newState: state, exitCode: 1 };
        }

        try {
            const content1 = this.readFile(files[0], state, input);
            const content2 = this.readFile(files[1], state, input);

            const lines1 = content1.split('\n').filter(l => l !== '');
            const lines2 = content2.split('\n').filter(l => l !== '');

            const splitLine = (line: string): string[] => {
                if (options.separator) {
                    return line.split(options.separator);
                } else {
                    return line.trim().split(/\s+/);
                }
            };

            const map2 = new Map<string, string[]>();
            for (const line of lines2) {
                const fields = splitLine(line);
                if (fields.length >= options.field2) {
                    const key = fields[options.field2 - 1];
                    const k = options.ignoreCase ? key.toLowerCase() : key;
                    if (!map2.has(k)) map2.set(k, []);
                    map2.get(k)!.push(line);
                }
            }

            const output: string[] = [];
            const matchedKeys2 = new Set<string>();

            for (const line1 of lines1) {
                const fields1 = splitLine(line1);
                let key = '';
                if (fields1.length >= options.field1) {
                    key = fields1[options.field1 - 1];
                }
                const lookupKey = options.ignoreCase ? key.toLowerCase() : key;

                if (map2.has(lookupKey)) {
                    matchedKeys2.add(lookupKey);
                    const matches = map2.get(lookupKey)!;
                    for (const line2 of matches) {
                        const fields2 = splitLine(line2);
                        let outLine = '';
                        const outSep = options.separator || ' ';

                        if (options.outputFormat) {
                            const rest1 = fields1.filter((_, idx) => idx !== options.field1 - 1).join(outSep);
                            const rest2 = fields2.filter((_, idx) => idx !== options.field2 - 1).join(outSep);
                            outLine = key + outSep + rest1 + outSep + rest2;
                        } else {
                            const rest1 = fields1.filter((_, idx) => idx !== options.field1 - 1).join(outSep);
                            const rest2 = fields2.filter((_, idx) => idx !== options.field2 - 1).join(outSep);
                            outLine = key + outSep + rest1 + outSep + rest2;
                        }
                        output.push(outLine);
                    }
                } else if (options.showUnpaired1) {
                    output.push(line1);
                }
            }

            if (options.showUnpaired2) {
                for (const line2 of lines2) {
                    const fields = splitLine(line2);
                    const key = fields[options.field2 - 1];
                    const k = options.ignoreCase ? key.toLowerCase() : key;
                    if (!matchedKeys2.has(k)) {
                        output.push(line2);
                    }
                }
            }

            return {
                output: output.join('\n'),
                newState: state,
                exitCode: 0
            };

        } catch (e) {
            return { output: `join: No such file`, newState: state, exitCode: 1 };
        }
    }

    private readFile(pathStr: string, state: TerminalState, input?: string): string {
        if (pathStr === '-') return input || '';
        const path = this.resolvePath(pathStr, state);
        return this.fs.readFile(path);
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
