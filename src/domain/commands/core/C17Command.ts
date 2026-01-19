/**
 * @file C17Command.ts
 * @description The 'c17' command. C language compiler (standard).
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class C17Command implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: 'c17: no input files', newState: state, exitCode: 1 };
    }
}
