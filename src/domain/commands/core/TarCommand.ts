/**
 * @file TarCommand.ts
 * @description The 'tar' command. Tape archiver.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class TarCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        if (args.length === 0) {
            return { output: 'tar: Must specify one of -c, -r, -t, -u, -x', newState: state, exitCode: 1 };
        }
        return { output: '', newState: state, exitCode: 0 };
    }
}
