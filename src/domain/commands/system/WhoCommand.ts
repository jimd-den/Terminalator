import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class WhoCommand implements ICommand {
    async execute(args: string[], state: TerminalState): Promise<{ output: string; newState: TerminalState; exitCode: number }> {
        return {
            output: `${state.user}  tty1  ${new Date().toLocaleDateString()}`,
            newState: state,
            exitCode: 0
        };
    }
}
