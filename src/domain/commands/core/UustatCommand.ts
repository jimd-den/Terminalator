/**
 * @file UustatCommand.ts
 * @description The 'uustat' command. uucp status inquiry and job control.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class UustatCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: '', newState: state, exitCode: 0 };
    }
}
