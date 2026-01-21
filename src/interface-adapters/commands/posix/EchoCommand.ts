import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class EchoCommand implements ICommand {
    name = 'echo';
    description = 'Display a line of text';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        return {
            output: args.join(' '),
            exitCode: 0,
            newState: state
        };
    }
}
