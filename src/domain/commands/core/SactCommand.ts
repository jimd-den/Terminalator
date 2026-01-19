/**
 * @file SactCommand.ts
 * @description The 'sact' command. Print current SCCS file editing activity.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class SactCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: 'sact: SCCS not supported', newState: state, exitCode: 1 };
    }
}
