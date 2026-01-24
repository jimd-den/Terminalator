import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file CsplitCommand.ts
 * @description The 'csplit' command. Split files based on context.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class CsplitCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: '', newState: state, exitCode: 0 };
    }
}
