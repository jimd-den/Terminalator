/**
 * @file GzipCommand.ts
 * @description The 'gzip' command. Compress files.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class GzipCommand implements ICommand {
    async execute(args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        // Simulation: Just say it worked or warn about missing file
        if (args.length === 0) {
            // gzip filters stdin to stdout
             return { output: '', newState: state, exitCode: 0 };
        }
        return { output: '', newState: state, exitCode: 0 };
    }
}
