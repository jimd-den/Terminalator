import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class HistoryCommand implements ICommand {
    name = 'history';
    description = 'Display command history';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        // state.history contains the list of commands
        const output = state.history.map((cmd, index) => `${index + 1}  ${cmd}`).join('\n');
        return {
            output,
            exitCode: 0,
            newState: state
        };
    }
}
