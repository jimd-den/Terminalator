import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class IdCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<{ output: string; newState: TerminalState; exitCode: number }> {
        const input = context.stdin;
        return {
            output: `uid=1000(${state.user}) gid=1000(${state.user}) groups=1000(${state.user})`,
            newState: state,
            exitCode: 0
        };
    }
}
