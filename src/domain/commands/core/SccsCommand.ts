/**
 * @file SccsCommand.ts
 * @description The 'sccs' command. Front end for the SCCS subsystem.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class SccsCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: 'sccs: SCCS not supported', newState: state, exitCode: 1 };
    }
}
