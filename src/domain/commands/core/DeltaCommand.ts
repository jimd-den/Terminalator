/**
 * @file DeltaCommand.ts
 * @description The 'delta' command. Make a delta (change) to an SCCS file.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class DeltaCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: 'delta: SCCS not supported', newState: state, exitCode: 1 };
    }
}
