/**
 * CommCommand - Core Command
 *
 * Select or reject lines common to two sorted files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Compare sorted files line by line.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class CommCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        let suppress1 = false;
        let suppress2 = false;
        let suppress3 = false;
        let ignoreCase = false;
        const files: string[] = [];

        for (const arg of args) {
            if (arg.startsWith('-')) {
                if (arg.includes('1')) suppress1 = true;
                if (arg.includes('2')) suppress2 = true;
                if (arg.includes('3')) suppress3 = true;
                if (arg.includes('i')) ignoreCase = true;
            } else {
                files.push(arg);
            }
        }

        if (files.length !== 2) {
             return { output: 'comm: missing operand', newState: state, exitCode: 1 };
        }

        try {
            const content1 = this.readFile(files[0], state, input);
            const content2 = this.readFile(files[1], state, input);

            const lines1 = content1.split('\n');
            const lines2 = content2.split('\n');
            if (lines1.length > 0 && lines1[lines1.length - 1] === '') lines1.pop();
            if (lines2.length > 0 && lines2[lines2.length - 1] === '') lines2.pop();

            let i = 0;
            let j = 0;
            const output: string[] = [];
            let exitCode = 0;

            const cmp = (a: string, b: string) => {
                if (ignoreCase) return a.toLowerCase().localeCompare(b.toLowerCase());
                return a.localeCompare(b);
            };

            for(let k=0; k<lines1.length-1; k++) {
                if (cmp(lines1[k], lines1[k+1]) > 0) exitCode = 1;
            }
            for(let k=0; k<lines2.length-1; k++) {
                if (cmp(lines2[k], lines2[k+1]) > 0) exitCode = 1;
            }

            while (i < lines1.length || j < lines2.length) {
                const l1 = i < lines1.length ? lines1[i] : null;
                const l2 = j < lines2.length ? lines2[j] : null;

                let comp = 0;
                if (l1 === null) comp = 1;
                else if (l2 === null) comp = -1;
                else comp = cmp(l1, l2);

                if (comp < 0) {
                    if (!suppress1) output.push(l1!);
                    i++;
                } else if (comp > 0) {
                    if (!suppress2) {
                         let prefix = '';
                         if (!suppress1) prefix = '\t';
                         output.push(prefix + l2!);
                    }
                    j++;
                } else {
                    if (!suppress3) {
                         let prefix = '';
                         if (!suppress1) prefix += '\t';
                         if (!suppress2) prefix += '\t';
                         output.push(prefix + l1!);
                    }
                    i++;
                    j++;
                }
            }

            return {
                output: output.join('\n'),
                newState: state,
                exitCode: exitCode
            };

        } catch (e) {
            return {
                output: `comm: No such file or directory`,
                newState: state,
                exitCode: 1
            };
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
