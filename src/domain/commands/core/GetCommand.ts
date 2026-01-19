/**
 * @file GetCommand.ts
 * @description The 'get' command. Get a version of an SCCS file.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class GetCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: 'get: SCCS not supported', newState: state, exitCode: 1 };
    }
}
