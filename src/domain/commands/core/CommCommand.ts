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
        // Options: -1, -2, -3 (suppress col 1, 2, 3)
        // Also -12, -13, etc.
        let suppress1 = false;
        let suppress2 = false;
        let suppress3 = false;
        const files: string[] = [];

        for (const arg of args) {
            if (arg.startsWith('-')) {
                if (arg.includes('1')) suppress1 = true;
                if (arg.includes('2')) suppress2 = true;
                if (arg.includes('3')) suppress3 = true;
            } else {
                files.push(arg);
            }
        }

        if (files.length !== 2) {
             return { output: 'comm: missing operand', newState: state, exitCode: 1 };
        }

        try {
            const content1 = this.readFile(files[0], state);
            const content2 = this.readFile(files[1], state);

            const lines1 = content1.split('\n');
            const lines2 = content2.split('\n');
            // Remove empty last line if exists
            if (lines1[lines1.length - 1] === '') lines1.pop();
            if (lines2[lines2.length - 1] === '') lines2.pop();

            let i = 0;
            let j = 0;
            const output: string[] = [];

            while (i < lines1.length || j < lines2.length) {
                const l1 = i < lines1.length ? lines1[i] : null;
                const l2 = j < lines2.length ? lines2[j] : null;

                if (l1 !== null && (l2 === null || l1 < l2)) {
                    // Only in file 1
                    if (!suppress1) {
                        output.push(l1);
                    }
                    i++;
                } else if (l2 !== null && (l1 === null || l2 < l1)) {
                    // Only in file 2
                    if (!suppress2) {
                         // Padding?
                         // If col 1 is printed, we need 1 tab. If suppressed, 0 tabs.
                         let prefix = '';
                         if (!suppress1) prefix = '\t';
                         output.push(prefix + l2);
                    }
                    j++;
                } else if (l1 !== null && l2 !== null && l1 === l2) {
                    // Common
                    if (!suppress3) {
                         let prefix = '';
                         if (!suppress1) prefix += '\t';
                         if (!suppress2) prefix += '\t';
                         output.push(prefix + l1);
                    }
                    i++;
                    j++;
                }
            }

            return {
                output: output.join('\n'),
                newState: state,
                exitCode: 0
            };

        } catch (e) {
            return {
                output: `comm: No such file or directory`,
                newState: state,
                exitCode: 1
            };
        }
    }

    private readFile(pathStr: string, state: TerminalState): string {
        const path = this.resolvePath(pathStr, state);
        return this.fs.readFile(path);
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
