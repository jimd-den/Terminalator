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
import { FileSystemService } from '../../services/FileSystemService';

interface SortOptions {
    reverse: boolean;
    numeric: boolean;
    unique: boolean;
    check: boolean;
    key?: number;
    outputFile?: string;
    files: string[];
}

export class SortCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const options: SortOptions = {
            reverse: false,
            numeric: false,
            unique: false,
            check: false,
            files: []
        };

        let skipNext = false;
        for (let i = 0; i < args.length; i++) {
            if (skipNext) {
                skipNext = false;
                continue;
            }
            const arg = args[i];
            if (arg === '-r') options.reverse = true;
            else if (arg === '-n') options.numeric = true;
            else if (arg === '-u') options.unique = true;
            else if (arg === '-c') options.check = true;
            else if (arg === '-f') { /* ignore fold case for now */ }
            else if (arg === '-o') {
                if (i + 1 < args.length) {
                    options.outputFile = args[i + 1];
                    skipNext = true;
                }
            }
            else if (arg === '-k') {
                if (i + 1 < args.length) {
                    options.key = parseInt(args[i + 1]);
                    skipNext = true;
                }
            }
            else if (!arg.startsWith('-')) {
                options.files.push(arg);
            }
        }

        let content = '';
        if (options.files.length > 0) {
            for (const file of options.files) {
                if (file === '-') {
                    content += (input || '') + '\n';
                    continue;
                }
                try {
                    const resolvedPath = this.resolvePath(file, state);
                    content += this.fs.readFile(resolvedPath) + '\n';
                } catch (e) {
                    return {
                        output: `sort: ${file}: No such file or directory`,
                        newState: state,
                        exitCode: 1
                    };
                }
            }
            if (content.endsWith('\n')) content = content.slice(0, -1);
        } else if (input !== undefined) {
            content = input;
        } else {
            return { output: '', newState: state, exitCode: 0 };
        }

        let lines = content.split('\n');
        if (content.endsWith('\n') && lines[lines.length - 1] === '') {
            lines.pop();
        }

        if (options.unique) {
            lines = Array.from(new Set(lines));
        }

        const compare = (a: string, b: string) => {
            let valA = a;
            let valB = b;

            if (options.key) {
                const partsA = a.trim().split(/\s+/);
                const partsB = b.trim().split(/\s+/);
                valA = partsA[options.key - 1] || '';
                valB = partsB[options.key - 1] || '';
            }

            let res = 0;
            if (options.numeric) {
                const numA = parseFloat(valA);
                const numB = parseFloat(valB);
                if (!isNaN(numA) && !isNaN(numB)) {
                    res = numA - numB;
                } else {
                    res = valA.localeCompare(valB);
                }
            } else {
                res = valA.localeCompare(valB);
            }
            return options.reverse ? -res : res;
        };

        if (options.check) {
            for (let i = 0; i < lines.length - 1; i++) {
                if (compare(lines[i], lines[i + 1]) > 0) {
                    return {
                        output: `sort: disorder: ${lines[i + 1]}`,
                        newState: state,
                        exitCode: 1
                    };
                }
            }
            return { output: '', newState: state, exitCode: 0 };
        }

        lines.sort(compare);

        const result = lines.join('\n');

        if (options.outputFile) {
            try {
                const resolvedOut = this.resolvePath(options.outputFile, state);
                this.fs.writeFile(resolvedOut, result);
                return { output: '', newState: state, exitCode: 0 };
            } catch (e) {
                return { output: `sort: ${options.outputFile}: Cannot write`, newState: state, exitCode: 1 };
            }
        }

        return {
            output: result,
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
