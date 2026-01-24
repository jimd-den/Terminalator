import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file IpcsCommand.ts
 * @description The 'ipcs' command. Report XSI interprocess communication facilities status.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class IpcsCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: 'Message Queues:\nShared Memory:\nSemaphores:', newState: state, exitCode: 0 };
    }
}
