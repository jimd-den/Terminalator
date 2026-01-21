/**
 * @file SactCommand.ts
 * @description The 'sact' command. Print current SCCS file editing activity.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class SactCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: 'sact: SCCS not supported', newState: state, exitCode: 1 };
    }
}
