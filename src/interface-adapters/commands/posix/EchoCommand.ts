import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class EchoCommand implements ICommand {
    name = 'echo';
    description = 'Display a line of text';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        return {
            output: args.join(' '),
            exitCode: 0,
            newState: state
        };
    }
}
