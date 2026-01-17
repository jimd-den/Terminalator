import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class PwdCommand implements ICommand {
    name = 'pwd';
    description = 'Print name of current/working directory';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return {
            output: context.cwd,
            exitCode: 0
        };
    }
}
