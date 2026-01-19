/**
 * TimeoutCommand - Core Command
 *
 * Run a command with a time limit.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Wraps execution in a Promise race.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class TimeoutCommand implements ICommand {
    constructor(
        private fs: FileSystem,
        private commandProvider: (name: string) => ICommand | undefined
    ) { }

    async execute(args: string[], state: TerminalState, input?: string): Promise<CommandResponse> {
        if (args.length < 2) {
             return { output: 'timeout: missing operand', newState: state, exitCode: 125 };
        }

        const durationStr = args[0];
        const cmdName = args[1];
        const cmdArgs = args.slice(2);

        let duration = parseFloat(durationStr);

        // Handle suffix: s, m, h, d
        const lastChar = durationStr.slice(-1);
        if (['s', 'm', 'h', 'd'].includes(lastChar)) {
             duration = parseFloat(durationStr.slice(0, -1));
             if (lastChar === 'm') duration *= 60;
             if (lastChar === 'h') duration *= 3600;
             if (lastChar === 'd') duration *= 86400;
        }

        if (isNaN(duration)) {
             return { output: `timeout: invalid time interval '${durationStr}'`, newState: state, exitCode: 125 };
        }

        // Convert to ms
        const timeoutMs = duration * 1000;

        const command = this.commandProvider(cmdName);
        if (!command) {
            return { output: `timeout: failed to run command '${cmdName}': No such file or directory`, newState: state, exitCode: 127 };
        }

        const timeoutPromise = new Promise<CommandResponse>((resolve) => {
            setTimeout(() => {
                resolve({
                    output: '',
                    newState: state,
                    exitCode: 124
                });
            }, timeoutMs);
        });

        const executionPromise = command.execute(cmdArgs, state, input);

        return Promise.race([executionPromise, timeoutPromise]);
    }
}
