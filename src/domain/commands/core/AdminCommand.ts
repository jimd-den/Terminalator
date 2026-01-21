/**
 * @file AdminCommand.ts
 * @description The 'admin' command. Create and administer SCCS files.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class AdminCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: 'admin: SCCS not supported', newState: state, exitCode: 1 };
    }
}
