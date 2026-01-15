import { ICommand, CommandResponse } from '../../domain/entities/Command';
import { ProcessContext } from '../../domain/entities/ProcessContext';
import { TerminalState } from '../../domain/entities/TerminalState';

export class WhoamiCommand implements ICommand {
    name = 'whoami';
    description = 'Print the user name associated with the current effective user ID';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return {
            output: context.user,
            exitCode: 0
        };
    }
}
