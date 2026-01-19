/**
 * @file UuxCommand.ts
 * @description The 'uux' command. Remote command execution.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class UuxCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: 'uux: network not supported', newState: state, exitCode: 1 };
    }
}
