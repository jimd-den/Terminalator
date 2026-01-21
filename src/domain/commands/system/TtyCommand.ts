import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class TtyCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<{ output: string; newState: TerminalState; exitCode: number }> {
        const input = context.stdin;
        return {
            output: '/dev/tty1',
            newState: state,
            exitCode: 0
        };
    }
}
