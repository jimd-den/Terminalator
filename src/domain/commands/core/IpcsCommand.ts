/**
 * @file IpcsCommand.ts
 * @description The 'ipcs' command. Report XSI interprocess communication facilities status.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class IpcsCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return { output: 'Message Queues:\nShared Memory:\nSemaphores:', newState: state, exitCode: 0 };
    }
}
