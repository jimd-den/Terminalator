/**
 * @file TimesCommand.ts
 * @description The 'times' command. Write process times.
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

export class TimesCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        // Output format: user time, system time, child user, child system
        // Mocked values
        return {
            output: '0m0.000s 0m0.000s\n0m0.000s 0m0.000s',
            newState: state,
            exitCode: 0
        };
    }
}
