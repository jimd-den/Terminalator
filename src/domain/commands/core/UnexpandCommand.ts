/**
 * UnexpandCommand - Core Command
 *
 * Convert spaces to tabs.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Convert runs of spaces to tabs.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class UnexpandCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        let all = false;
        const files: string[] = [];

        for (const arg of args) {
            if (arg === '-a') {
                all = true;
            } else if (!arg.startsWith('-')) {
                files.push(arg);
            }
        }

        let content = '';
        if (files.length > 0) {
            for (const file of files) {
                try {
                    content += this.fs.readFile(this.resolvePath(file, state));
                } catch (e) {
                    return { output: `unexpand: ${file}: No such file`, newState: state, exitCode: 1 };
                }
            }
        } else if (input) {
            content = input;
        } else {
            return { output: '', newState: state, exitCode: 0 };
        }

        const lines = content.split('\n');
        const output: string[] = [];
        const tabStop = 8; // Simplified fixed tab stops

        for (const line of lines) {
            // Simplified logic: replace 8 spaces with tab?
            // Correct logic: calculate tab stops.

            if (!all) {
                // Only leading blank characters
                // Count leading spaces
                let spaces = 0;
                while (spaces < line.length && line[spaces] === ' ') {
                    spaces++;
                }
                if (spaces > 0) {
                    // Convert leading spaces to tabs + spaces
                    // number of tabs = spaces / tabStop
                    // remainder spaces
                    const tabs = Math.floor(spaces / tabStop);
                    const rem = spaces % tabStop;
                    output.push('\t'.repeat(tabs) + ' '.repeat(rem) + line.slice(spaces));
                } else {
                    output.push(line);
                }
            } else {
                // -a: convert all sequences of two or more spaces immediately preceding a tab stop
                // This is complex. Simplified: convert all runs of >=2 spaces?
                // Or simply re-tabulate line?
                // Let's implement a re-tabulation: iterate chars, track column.
                // If we see space, accumulate. If accumulated spaces reach tab stop, emit tab.

                let res = '';
                let col = 0;
                let pendingSpaces = 0;

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === ' ') {
                        pendingSpaces++;
                        col++;
                        if (col % tabStop === 0 && pendingSpaces > 1) { // >1 requirement? standard says "two or more"?
                            // Standard unexpand -a: "convert all strings of whitespace... to tabs"
                            // Actually just compress to tabs where possible.
                            res += '\t';
                            pendingSpaces = 0;
                        }
                    } else {
                        // flush pending spaces
                        res += ' '.repeat(pendingSpaces);
                        pendingSpaces = 0;
                        res += char;
                        col++;
                        if (char === '\t') {
                            // Align col to next tab stop
                            col = Math.ceil((col + 1) / tabStop) * tabStop;
                        } else if (char === '\b') {
                            col--;
                        }
                    }
                }
                res += ' '.repeat(pendingSpaces);
                output.push(res);
            }
        }

        return {
            output: output.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
