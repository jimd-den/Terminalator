import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file UngetCommand.ts
 * @description The 'unget' command. Undo a previous get of an SCCS file.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class UngetCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: 'unget: SCCS not supported', newState: state, exitCode: 1 };
    }
}
