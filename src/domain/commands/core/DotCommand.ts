/**
 * @file DotCommand.ts
 * @description The '.' command. Execute commands in the current environment.
 *
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements ICommand.
 * 2. Literate Documentation: Explains usage.
 * 3. Dependency Minimalism: Minimal deps.
 * 4. Telemetry: Logged.
 * 5. Performance: O(1).
 * 6. Universal Readability: Clear name.
 * 7. Pragmatic Patterns: Command pattern.
 * 8. SOLID / KISS: Simple stub for compliance.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystem } from '../../entities/FileSystem';

export class DotCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        if (args.length === 0) {
            return {
                output: '.: filename argument required',
                newState: state,
                exitCode: 2
            };
        }
        // In full implementation, this reads the file and executes it in current context.
        // We will verify file existence for compliance.
        const file = args[0];
        const node = this.fs.resolve(file, state.currentDirectory);
        if (!node) {
            return {
                output: `.: ${file}: No such file or directory`,
                newState: state,
                exitCode: 1
            };
        }
        // Read file content
        const absPath = this.fs.getAbsolutePath(node);
        const content = this.fs.readFile(absPath);

        if (context.executor) {
            // Execute in CURRENT state (shared environment)
            const response = await context.executor.execute(content, state);
            return response;
        }

        return {
            output: '.: executor not available',
            newState: state,
            exitCode: 1
        };
    }
}
