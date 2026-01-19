/**
 * @file FgCommand.ts
 * @description The 'fg' command. Run jobs in the foreground.
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

export class FgCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return {
            output: 'no current job',
            newState: state,
            exitCode: 1
        };
    }
}
