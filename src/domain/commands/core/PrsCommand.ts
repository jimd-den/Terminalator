import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file PrsCommand.ts
 * @description The 'prs' command. Print an SCCS file.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class PrsCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: 'prs: SCCS not supported', newState: state, exitCode: 1 };
    }
}
