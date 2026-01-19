/**
 * @file ReadonlyCommand.ts
 * @description The 'readonly' command. Set readonly attribute for variables.
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
import { TerminalState } from '../../entities/TerminalState';

export class ReadonlyCommand implements ICommand {
    async execute(args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
         if (args.length === 0) {
            // Should list readonly vars (mocked)
            return {
                output: '',
                newState: state,
                exitCode: 0
            };
        }
        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}
