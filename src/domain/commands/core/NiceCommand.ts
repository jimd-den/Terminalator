/**
 * NiceCommand - Core Command
 *
 * Invoke a utility with an altered nice value.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Scheduling priority (simulated).
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class NiceCommand implements ICommand {
    constructor(
        private fs: FileSystem,
        private commandProvider: (name: string) => ICommand | undefined
    ) { }

    async execute(args: string[], state: TerminalState, input?: string): Promise<CommandResponse> {
        // nice [-n increment] utility [argument...]
        let increment = 10;
        let cmdIndex = 0;

        if (args.length > 0 && args[0] === '-n') {
            increment = parseInt(args[1]) || 10;
            cmdIndex = 2;
        }

        if (cmdIndex >= args.length) {
            // print current niceness? usually 0.
            return { output: '0', newState: state, exitCode: 0 };
        }

        const cmdName = args[cmdIndex];
        const utilityArgs = args.slice(cmdIndex + 1);

        const command = this.commandProvider(cmdName);
        if (!command) {
            return { output: `nice: ${cmdName}: No such file or directory`, newState: state, exitCode: 127 };
        }

        // Just run it. We don't have a scheduler.
        try {
            return await command.execute(utilityArgs, state, input);
        } catch (e: any) {
            return { output: `nice: ${cmdName}: ${e.message}`, newState: state, exitCode: 1 }; // or 126/127
        }
    }
}
