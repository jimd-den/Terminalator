import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file GetCommand.ts
 * @description The 'get' command. Get a version of an SCCS file.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class GetCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return { output: 'get: SCCS not supported', newState: state, exitCode: 1 };
    }
}
