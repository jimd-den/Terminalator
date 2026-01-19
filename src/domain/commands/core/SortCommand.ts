/**
 * SortCommand - Core Command
 *
 * Sort lines of text files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Sorts input lines.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

interface SortOptions {
    reverse: boolean;
    numeric: boolean;
    unique: boolean;
    files: string[];
}

export class SortCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const options: SortOptions = {
            reverse: false,
            numeric: false,
            unique: false,
            files: []
        };

        // Argument Parsing
        for (const arg of args) {
            if (arg === '-r') options.reverse = true;
            else if (arg === '-n') options.numeric = true;
            else if (arg === '-u') options.unique = true;
            else if (!arg.startsWith('-')) {
                options.files.push(arg);
            }
        }

        let content = '';
        if (options.files.length > 0) {
            for (const file of options.files) {
                try {
                    const resolvedPath = this.resolvePath(file, state);
                    content += this.fs.readFile(resolvedPath) + '\n'; // naive cat
                } catch (e) {
                    return {
                        output: `sort: ${file}: No such file or directory`,
                        newState: state,
                        exitCode: 1
                    };
                }
            }
            // Trim trailing newline from concatenation if needed, or handle in split
            if (content.endsWith('\n')) content = content.slice(0, -1);
        } else if (input !== undefined) {
            content = input;
        } else {
             return { output: '', newState: state, exitCode: 0 };
        }

        let lines = content.split('\n');
        // Filter empty lines if split caused one at end?
        // Actually usually we keep empty lines in sort, but typical split on "a\n" gives ["a", ""].
        // If file content is "a\n", it has 1 line "a".
        // If file content is "a", it has 1 line "a".
        // We might need to handle this robustly.
        if (content.endsWith('\n') && lines[lines.length - 1] === '') {
            lines.pop();
        }

        if (options.unique) {
            lines = Array.from(new Set(lines));
        }

        lines.sort((a, b) => {
            let res = 0;
            if (options.numeric) {
                // simple parsing
                const numA = parseFloat(a.trim());
                const numB = parseFloat(b.trim());
                // If NaN, fallback to string sort? POSIX says "arithmetic value".
                // If not numbers, usually treated as 0 or handled specifically.
                // We'll treat NaN as low value or fallback?
                // Let's fallback to lexical if NaN.
                if (isNaN(numA) || isNaN(numB)) {
                    res = a.localeCompare(b);
                } else {
                    res = numA - numB;
                }
            } else {
                res = a.localeCompare(b);
            }

            return options.reverse ? -res : res;
        });

        return {
            output: lines.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
