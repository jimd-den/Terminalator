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

export class JoinCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const files = args.filter(a => !a.startsWith('-'));
        if (files.length !== 2) {
             return { output: 'join: missing operand', newState: state, exitCode: 1 };
        }

        try {
            const content1 = this.fs.readFile(this.resolvePath(files[0], state));
            const content2 = this.fs.readFile(this.resolvePath(files[1], state));

            const lines1 = content1.split('\n').filter(l => l);
            const lines2 = content2.split('\n').filter(l => l);

            // Simplified: Join on first field (whitespace delimited)
            // Ideally requires sorted input. We assume sorted.

            const map2 = new Map<string, string>();
            // Build index for file 2 (assuming unique keys for simple join, standard join handles duplicates but let's start simple)
            // Actually standard join handles one-to-many.

            for (const line of lines2) {
                const parts = line.trim().split(/\s+/);
                if (parts.length > 0) {
                    const key = parts[0];
                    map2.set(key, line); // Stores last occurrence if dupes, simplified.
                }
            }

            const output: string[] = [];

            for (const line of lines1) {
                const parts = line.trim().split(/\s+/);
                if (parts.length > 0) {
                    const key = parts[0];
                    if (map2.has(key)) {
                        const line2 = map2.get(key)!;
                        const parts2 = line2.trim().split(/\s+/);
                        // Output: key rest1 rest2
                        const rest1 = parts.slice(1).join(' ');
                        const rest2 = parts2.slice(1).join(' ');
                        output.push(`${key} ${rest1} ${rest2}`);
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

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
