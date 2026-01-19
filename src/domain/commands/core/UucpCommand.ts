/**
 * @file UucpCommand.ts
 * @description The 'uucp' command. Unix-to-Unix system copy.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class UucpCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: 'uucp: network not supported', newState: state, exitCode: 1 };
    }
}
