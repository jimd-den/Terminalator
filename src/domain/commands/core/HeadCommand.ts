/**
 * HeadCommand - Core Command
 *
 * Output the first part of files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to view the beginning of files.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class HeadCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        let linesToPrint = 10;
        const operands = [];

        // Proper parsing loop to distinguish flags from operands
        let skipNext = false;

        for (let i = 0; i < args.length; i++) {
            if (skipNext) {
                skipNext = false;
                continue;
            }

            if (args[i] === '-n') {
                if (i + 1 < args.length) {
                    linesToPrint = parseInt(args[i + 1]);
                    skipNext = true;
                }
                // If -n is last, it's an error, but let's ignore for now or use default
            } else if (args[i].startsWith('-') && args[i] !== '-') {
                // Other flags ignored
            } else {
                operands.push(args[i]);
            }
        }

        const getHead = (content: string): string => {
            const lines = content.split('\n');
            // slice(0, 100) on 5 lines returns 5 lines. safe.
            const snippet = lines.slice(0, linesToPrint);
            return snippet.join('\n');
        };

        if (operands.length === 0) {
            // Use input
            if (input !== undefined) {
                return { output: getHead(input), newState: state, exitCode: 0 };
            } else {
                // Head waits for stdin normally. Here error/empty.
                return { output: '', newState: state, exitCode: 0 };
            }
        }

        // Process file
        const filename = operands[0];
        let path = filename;

        if (!path.startsWith('/')) {
            path = state.currentDirectory === '/' ? `/${filename}` : `${state.currentDirectory}/${filename}`;
        }

        try {
            const content = this.fs.readFile(path);
            return {
                output: getHead(content),
                newState: state,
                exitCode: 0
            };
        } catch (error: any) {
            return {
                output: `head: cannot open '${filename}' for reading: No such file or directory`,
                newState: state,
                exitCode: 1
            };
        }
    }
}
