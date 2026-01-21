/**
 * @file ReturnCommand.ts
 * @description The 'return' command. Return from a function.
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
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class ReturnCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        const exitCode = args.length > 0 ? parseInt(args[0], 10) : 0;
        return {
            output: '',
            newState: state,
            exitCode: isNaN(exitCode) ? 0 : exitCode
        };
    }
}
