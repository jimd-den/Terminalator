import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file CpioCommand.ts
 * @description The 'cpio' command. Copy in and out (archive).
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class CpioCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: '', newState: state, exitCode: 0 };
    }
}
