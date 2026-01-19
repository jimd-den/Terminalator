/**
 * @file DeltaCommand.ts
 * @description The 'delta' command. Make a delta (change) to an SCCS file.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class DeltaCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: 'delta: SCCS not supported', newState: state, exitCode: 1 };
    }
}
