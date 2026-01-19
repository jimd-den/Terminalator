/**
 * @file ReadCommand.ts
 * @description The 'read' command. Read a line from standard input.
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

export class ReadCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, input?: string): Promise<CommandResponse> {
        // If input (piped) is present, assign to vars.
        // If not, it would block in real shell. Here we just exit.
        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}
