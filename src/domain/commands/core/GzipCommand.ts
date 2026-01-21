/**
 * @file GzipCommand.ts
 * @description The 'gzip' command. Compress files.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class GzipCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        // Simulation: Just say it worked or warn about missing file
        if (args.length === 0) {
            // gzip filters stdin to stdout
             return { output: '', newState: state, exitCode: 0 };
        }
        return { output: '', newState: state, exitCode: 0 };
    }
}
