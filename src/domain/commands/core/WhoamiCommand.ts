import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class WhoamiCommand implements ICommand {
    name = 'whoami';
    description = 'Print the user name associated with the current effective user ID';

    execute(args: string[], state: TerminalState, input?: string): CommandResponse | Promise<CommandResponse> {
        return {
            output: state.user || 'operator',
            exitCode: 0
        };
    }
}
