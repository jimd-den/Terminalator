/**
 * @file AdminCommand.ts
 * @description The 'admin' command. Create and administer SCCS files.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class AdminCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: 'admin: SCCS not supported', newState: state, exitCode: 1 };
    }
}
