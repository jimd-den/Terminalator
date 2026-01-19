/**
 * @file PrsCommand.ts
 * @description The 'prs' command. Print an SCCS file.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class PrsCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: 'prs: SCCS not supported', newState: state, exitCode: 1 };
    }
}
