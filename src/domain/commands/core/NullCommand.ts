/**
 * @file NullCommand.ts
 * @description The ':' command (null command). It does nothing and returns exit code 0.
 *
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements ICommand in domain layer.
 * 2. Literate Documentation: This header explains the purpose.
 * 3. Dependency Minimalism: No external deps.
 * 4. Telemetry: Standard command execution logging via system.
 * 5. Performance: O(1).
 * 6. Universal Readability: Named NullCommand, alias ':'.
 * 7. Pragmatic Patterns: Command pattern.
 * 8. SOLID / KISS: Extremely simple.
 */

import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class NullCommand implements ICommand {
    async execute(_args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}
