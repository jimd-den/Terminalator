/**
 * TimeCommand - Core Command
 *
 * Time a simple command.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Watchman’s Log (Telemetry)
 *
 * Intent:
 * Measure duration.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class TimeCommand implements ICommand {
    constructor(
        private fs: FileSystemService,
        private commandProvider: (name: string) => ICommand | undefined
    ) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        // time [-p] utility [argument...]
        const cmdArgs = args.filter(a => a !== '-p'); // ignore -p flag for now

        if (cmdArgs.length === 0) {
             return { output: 'time: missing operand', newState: state, exitCode: 1 };
        }

        const cmdName = cmdArgs[0];
        const utilityArgs = cmdArgs.slice(1);

        const command = this.commandProvider(cmdName);
        if (!command) {
            return { output: `time: command not found: ${cmdName}`, newState: state, exitCode: 127 };
        }

        const start = Date.now();
        let response: CommandResponse;

        try {
            response = await command.execute(utilityArgs, state, input);
        } catch (e: any) {
            return { output: `time: error executing ${cmdName}: ${e.message}`, newState: state, exitCode: 1 };
        }

        const end = Date.now();
        const duration = (end - start) / 1000;

        // POSIX format:
        // real 0.00
        // user 0.00
        // sys 0.00
        const timing = `\nreal ${duration.toFixed(2)}\nuser 0.00\nsys 0.00`;

        return {
            output: response.output + timing,
            newState: response.newState,
            exitCode: response.exitCode
        };
    }
}
