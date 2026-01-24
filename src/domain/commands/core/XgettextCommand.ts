import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file XgettextCommand.ts
 * @description The 'xgettext' command. Extract gettext strings from source.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class XgettextCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: '', newState: state, exitCode: 0 };
    }
}
