/**
 * @file LocaleCommand.ts
 * @description The 'locale' command. Get locale-specific information.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class LocaleCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: 'LANG=en_US.UTF-8\nLC_ALL=', newState: state, exitCode: 0 };
    }
}
