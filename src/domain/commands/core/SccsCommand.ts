/**
 * @file SccsCommand.ts
 * @description The 'sccs' command. Front end for the SCCS subsystem.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class SccsCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: 'sccs: SCCS not supported', newState: state, exitCode: 1 };
    }
}
