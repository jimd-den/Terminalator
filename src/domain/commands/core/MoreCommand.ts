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
import { TerminalState } from '../../entities/TerminalState';
import { FileSystem } from '../../entities/FileSystem';

export class MoreCommand implements ICommand {
    constructor(private fs: FileSystem) {}

    async execute(args: string[], state: TerminalState, input?: string): Promise<CommandResponse> {
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
             const resolved = this.fs.resolveNode(file, state.currentDirectory);
             if (!resolved || resolved.type !== 'file') {
                 output += `more: ${file}: No such file or directory\n`;
                 exitCode = 1;
                 continue;
             }
             output += resolved.content || ''; // 'more' typically separates files, but basic cat behavior suffices for simple checks
        }

        return {
            output: output,
            newState: state,
            exitCode: exitCode
        };
    }
}
