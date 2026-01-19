/**
 * @file ValCommand.ts
 * @description The 'val' command. Validate an SCCS file.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class ValCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: 'val: SCCS not supported', newState: state, exitCode: 1 };
    }
}
