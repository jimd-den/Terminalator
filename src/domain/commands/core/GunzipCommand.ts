import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file GunzipCommand.ts
 * @description The 'gunzip' command. Decompress files.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class GunzipCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = getStdinAsString(context);
         if (args.length === 0) {
             return { output: '', newState: state, exitCode: 0 };
        }
        return { output: '', newState: state, exitCode: 0 };
    }
}
