/**
 * PasteCommand - Core Command
 *
 * Merge corresponding or subsequent lines of files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Join files horizontally.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class PasteCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        let delimiter = '\t';
        let serial = false;
        const files: string[] = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === '-d') {
                delimiter = args[++i] || '\t';
                // Handle escape sequences in delimiter (simple)
                delimiter = delimiter.replace(/\\t/g, '\t').replace(/\\n/g, '\n');
            } else if (arg === '-s') {
                serial = true;
            } else if (!arg.startsWith('-')) {
                files.push(arg);
            }
        }

        if (files.length === 0) {
             // Read from stdin?
             // Without stdin handling in our shell fully, let's require files.
             // Or fail.
             return { output: '', newState: state, exitCode: 0 };
        }

        const fileContents: string[][] = [];
        try {
            for (const file of files) {
                if (file === '-') {
                    // Stdin placeholder, use input if available
                    fileContents.push((input || '').split('\n'));
                } else {
                    const path = this.resolvePath(file, state);
                    const content = this.fs.readFile(path);
                    const lines = content.split('\n');
                    if (lines[lines.length - 1] === '') lines.pop(); // Trim last empty
                    fileContents.push(lines);
                }
            }
        } catch (e) {
            return {
                output: `paste: No such file or directory`,
                newState: state,
                exitCode: 1
            };
        }

        const output: string[] = [];

        if (serial) {
            // Paste -s: one file per line, joined by delimiter
            for (const lines of fileContents) {
                output.push(lines.join(delimiter));
            }
        } else {
            // Standard paste: parallel merge
            let maxLines = 0;
            for (const lines of fileContents) maxLines = Math.max(maxLines, lines.length);

            for (let i = 0; i < maxLines; i++) {
                const row: string[] = [];
                for (const lines of fileContents) {
                    row.push(i < lines.length ? lines[i] : '');
                }
                output.push(row.join(delimiter));
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
