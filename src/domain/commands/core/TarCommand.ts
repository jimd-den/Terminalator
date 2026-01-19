/**
 * @file TarCommand.ts
 * @description The 'tar' command. Tape archiver.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class TarCommand implements ICommand {
    async execute(args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        if (args.length === 0) {
            return { output: 'tar: Must specify one of -c, -r, -t, -u, -x', newState: state, exitCode: 1 };
        }
        return { output: '', newState: state, exitCode: 0 };
    }
}
