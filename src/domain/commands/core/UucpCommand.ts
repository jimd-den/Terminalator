import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file UucpCommand.ts
 * @description The 'uucp' command. Unix-to-Unix system copy.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class UucpCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: 'uucp: network not supported', newState: state, exitCode: 1 };
    }
}
