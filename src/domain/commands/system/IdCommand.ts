import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class IdCommand implements ICommand {
    async execute(args: string[], state: TerminalState): Promise<{ output: string; newState: TerminalState; exitCode: number }> {
        return {
            output: `uid=1000(${state.user}) gid=1000(${state.user}) groups=1000(${state.user})`,
            newState: state,
            exitCode: 0
        };
    }
}
