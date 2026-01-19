/**
 * @file UngetCommand.ts
 * @description The 'unget' command. Undo a previous get of an SCCS file.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class UngetCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: 'unget: SCCS not supported', newState: state, exitCode: 1 };
    }
}
