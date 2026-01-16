import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class FalseCommand implements ICommand {
    async execute(args: string[], state: TerminalState): Promise<{ output: string; newState: TerminalState; exitCode: number }> {
        return {
            output: '',
            newState: state,
            exitCode: 1
        };
    }
}
