/**
 * @file CsplitCommand.ts
 * @description The 'csplit' command. Split files based on context.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class CsplitCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: '', newState: state, exitCode: 0 };
    }
}
