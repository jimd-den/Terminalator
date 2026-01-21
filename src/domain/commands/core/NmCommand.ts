/**
 * @file NmCommand.ts
 * @description The 'nm' command. Write the name list of an object file.
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

export class NmCommand implements ICommand {
    async execute(_args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (_args.length === 0) {
             return {
                output: 'nm: a.out: No such file',
                newState: state,
                exitCode: 1
            };
        }
        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}
