import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file RmdelCommand.ts
 * @description The 'rmdel' command. Remove a delta from an SCCS file.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class RmdelCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: 'rmdel: SCCS not supported', newState: state, exitCode: 1 };
    }
}
