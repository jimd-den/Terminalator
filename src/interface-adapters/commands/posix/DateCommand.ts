import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class DateCommand implements ICommand {
    name = 'date';
    description = 'Display the current time';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return {
            output: new Date().toString(),
            exitCode: 0,
            newState: state
        };
    }
}
