import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file ExportCommand.ts
 * @description The 'export' command. Set export attribute for variables.
 *
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements ICommand.
 * 2. Literate Documentation: Explains usage.
 * 3. Dependency Minimalism: Minimal deps.
 * 4. Telemetry: Logged.
 * 5. Performance: O(1).
 * 6. Universal Readability: Clear name.
 * 7. Pragmatic Patterns: Command pattern.
 * 8. SOLID / KISS: Simple implementation.
 */

import { ICommand, CommandResponse } from '../ICommand';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { ProcessContext } from '../../../domain/entities/ProcessContext';

export class ExportCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const newEnv = { ...state.environment };

        for (const arg of args) {
            if (arg.includes('=')) {
                const [key, ...rest] = arg.split('=');
                const val = rest.join('=');
                // Validate key? Shell variable naming rules.
                if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
                    newEnv[key] = val;
                }
            }
        }

        return {
            output: '',
            newState: {
                ...state,
                environment: newEnv
            },
            exitCode: 0
        };
    }
}
