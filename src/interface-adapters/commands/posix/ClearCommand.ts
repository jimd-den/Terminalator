import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class ClearCommand implements ICommand {
    name = 'clear';
    description = 'Clear the terminal screen';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return {
            output: '',
            exitCode: 0,
            uiAction: 'CLEAR'
        };
    }
}
