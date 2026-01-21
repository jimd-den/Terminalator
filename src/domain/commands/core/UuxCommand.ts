/**
 * @file UuxCommand.ts
 * @description The 'uux' command. Remote command execution.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class UuxCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: 'uux: network not supported', newState: state, exitCode: 1 };
    }
}
