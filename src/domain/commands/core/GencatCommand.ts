/**
 * @file GencatCommand.ts
 * @description The 'gencat' command. Generate a formatted message catalog.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class GencatCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: '', newState: state, exitCode: 0 };
    }
}
