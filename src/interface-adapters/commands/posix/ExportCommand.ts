import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class ExportCommand implements ICommand {
    name = 'export';
    description = 'Set environment variables';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length === 0) {
            // List exported variables
            // declare -x VAR="val" style
            const output = Object.entries(state.environment)
                .map(([key, val]) => `declare -x ${key}="${val}"`)
                .join('\n');
            return { output, exitCode: 0, newState: state };
        }

        // Handle export VAR=VALUE
        const newState = { ...state, environment: { ...state.environment } };

        for (const arg of args) {
            const parts = arg.split('=');
            if (parts.length > 1) {
                const key = parts[0];
                const value = parts.slice(1).join('='); // Handle VALUE containing =
                newState.environment[key] = value;
            } else {
                // export VAR (marked for export, but in our simple vars it just ensures existence?)
                // POSIX says names are exported. If var exists, mark exported.
                // We simplify by treating all env vars as exported for now.
            }
        }

        return {
            output: '',
            exitCode: 0,
            newState
        };
    }
}
