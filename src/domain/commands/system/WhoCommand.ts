import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class WhoCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<{ output: string; newState: TerminalState; exitCode: number }> {
        const input = context.stdin;
        return {
            output: `${state.user}  tty1  ${new Date().toLocaleDateString()}`,
            newState: state,
            exitCode: 0
        };
    }
}
