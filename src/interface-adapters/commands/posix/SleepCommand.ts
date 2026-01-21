import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class SleepCommand implements ICommand {
    name = 'sleep';
    description = 'Delay for a specified amount of time';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        if (args.length === 0) {
            return {
                output: 'sleep: missing operand',
                exitCode: 1
            };
        }

        const duration = parseFloat(args[0]);

        if (isNaN(duration)) {
            return {
                output: `sleep: invalid time interval '${args[0]}'`,
                exitCode: 1
            };
        }

        // Wait for usage seconds
        await new Promise(resolve => setTimeout(resolve, duration * 1000));

        return {
            output: '',
            exitCode: 0
        };
    }
}
