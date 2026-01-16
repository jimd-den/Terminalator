import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class DateCommand implements ICommand {
    async execute(args: string[], state: TerminalState): Promise<{ output: string; newState: TerminalState; exitCode: number }> {
        return {
            output: new Date().toString(),
            newState: state,
            exitCode: 0
        };
    }
}
