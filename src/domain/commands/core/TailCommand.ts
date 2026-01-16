/**
 * TailCommand - Core Command
 *
 * Output the last part of files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to view the end of files.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class TailCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        let linesToPrint = 10;

        // Similar strict parsing to HeadCommand
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '-n') {
                if (i + 1 < args.length) {
                    linesToPrint = parseInt(args[i + 1]);
                }
            }
        }

        const operands = args.filter(arg => !arg.startsWith('-') && arg !== linesToPrint.toString());
        // Logic above is flawed if filename is number.
        // Better: parse properly.
        // But for update:
        const targets = [];
        let skipNext = false;
        for (let i = 0; i < args.length; i++) {
            if (skipNext) { skipNext = false; continue; }
            if (args[i] === '-n') {
                skipNext = true;
                continue;
            }
            targets.push(args[i]);
        }

        const getTail = (content: string): string => {
            const lines = content.split('\n');
            // Handle trailing newline effect split?
            if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop(); // Remove last empty from split

            const snippet = lines.slice(-linesToPrint);
            return snippet.join('\n');
        };

        if (targets.length === 0) {
            if (input !== undefined) {
                return { output: getTail(input), newState: state, exitCode: 0 };
            } else {
                return { output: '', newState: state, exitCode: 0 };
            }
        }

        const filename = targets[0];
        let path = filename;

        if (!path.startsWith('/')) {
            path = state.currentDirectory === '/' ? `/${filename}` : `${state.currentDirectory}/${filename}`;
        }

        try {
            const content = this.fs.readFile(path);
            return {
                output: getTail(content),
                newState: state,
                exitCode: 0
            };
        } catch (error: any) {
            return {
                output: `tail: cannot open '${filename}' for reading: No such file or directory`,
                newState: state,
                exitCode: 1
            };
        }
    }
}
