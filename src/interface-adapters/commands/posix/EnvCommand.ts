import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class EnvCommand implements ICommand {
    name = 'env';
    description = 'Print environment variables';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const output = Object.entries(state.environment)
            .map(([key, val]) => `${key}=${val}`)
            .join('\n');
        return {
            output,
            exitCode: 0,
            newState: state
        };
    }
}
