/**
 * @file RmdelCommand.ts
 * @description The 'rmdel' command. Remove a delta from an SCCS file.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class RmdelCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: 'rmdel: SCCS not supported', newState: state, exitCode: 1 };
    }
}
