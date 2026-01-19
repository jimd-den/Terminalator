/**
 * @file FuserCommand.ts
 * @description The 'fuser' command. File user.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class FuserCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: '', newState: state, exitCode: 0 };
    }
}
