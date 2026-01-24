import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file MoreCommand.ts
 * @description The 'more' command. Display file contents one screen at a time.
 * For non-interactive mode, it acts like cat.
 *
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements ICommand.
 * 2. Literate Documentation: Explains usage.
 * 3. Dependency Minimalism: Minimal deps.
 * 4. Telemetry: Logged.
 * 5. Performance: O(1).
 * 6. Universal Readability: Clear name.
 * 7. Pragmatic Patterns: Command pattern.
 * 8. SOLID / KISS: Reuses Cat logic or simple read.
 */

import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';

export class MoreCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        // Non-interactive simulation: just output content like cat
        if (args.length === 0) {
            return {
                output: input || '',
                newState: state,
                exitCode: 0
            };
        }

        let output = '';
        let exitCode = 0;

        for (const file of args) {
            const resolved = this.fs.resolve(file, state.currentDirectory);
            if (!resolved) {
                output += `more: ${file}: No such file or directory\n`;
                exitCode = 1;
                continue;
            }
            if (this.fs.isDirectory(resolved)) {
                output += `more: ${file}: Is a directory\n`;
                exitCode = 1;
                continue;
            }
            // Read content via service
            try {
                const content = this.fs.readFile(file, state.currentDirectory);
                output += content;
            } catch (e: any) {
                output += `more: ${file}: ${e.message}\n`;
                exitCode = 1;
            }
        }

        return {
            output: output,
            newState: state,
            exitCode: exitCode
        };
    }
}
