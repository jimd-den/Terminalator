import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class DateCommand implements ICommand {
    name = 'date';
    description = 'Display the current time';

    execute(args: string[], state: TerminalState, input?: string): CommandResponse | Promise<CommandResponse> {
        return {
            output: new Date().toString(),
            exitCode: 0,
            newState: state
        };
    }
}
