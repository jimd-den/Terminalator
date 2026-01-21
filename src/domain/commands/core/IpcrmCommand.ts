/**
 * @file IpcrmCommand.ts
 * @description The 'ipcrm' command. Remove an XSI interprocess communication identifier.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class IpcrmCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: '', newState: state, exitCode: 0 };
    }
}
