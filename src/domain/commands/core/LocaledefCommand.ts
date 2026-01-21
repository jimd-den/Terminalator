/**
 * @file LocaledefCommand.ts
 * @description The 'localedef' command. Define locale environment.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class LocaledefCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: '', newState: state, exitCode: 0 };
    }
}
