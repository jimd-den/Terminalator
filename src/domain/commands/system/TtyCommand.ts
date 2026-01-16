import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class TtyCommand implements ICommand {
    async execute(args: string[], state: TerminalState): Promise<{ output: string; newState: TerminalState; exitCode: number }> {
        return {
            output: '/dev/tty1',
            newState: state,
            exitCode: 0
        };
    }
}
