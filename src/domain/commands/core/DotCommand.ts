import { getStdinAsString } from '../../entities/ProcessContext';
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
        if (args.length === 0) {
            return {
                output: '.: filename argument required',
                newState: state,
                exitCode: 2
            };
        }

        const file = args[0];
        let absPath: string | null = null;
        let foundNode: any = null;

        // 1. Path Lookup (if no slash)
        if (file.indexOf('/') === -1 && state.environment['PATH']) {
            const paths = state.environment['PATH'].split(':');
            for (const p of paths) {
                const node = this.fs.resolve(file, p);
                if (node && !this.fs.isDirectory(node)) {
                    foundNode = node;
                    absPath = this.fs.getAbsolutePath(node);
                    break;
                }
            }
        }

        // 2. Direct/CWD Lookup (if not found in PATH or has slash)
        // POSIX: If not found in PATH (for no-slash), check CWD (only if not strictly POSIX, but tests expect it often? 
        // Actually POSIX says if no slash, use PATH. If not found, behavior is undefined? 
        // Bash falls back to CWD in non-posix mode. 
        // Our tests imply it should find it if in CWD. 'DOT_02' is explicit about 'Path lookup'.
        // Let's fallback to CWD if not found.
        if (!foundNode) {
            const node = this.fs.resolve(file, state.currentDirectory);
            if (node) {
                foundNode = node;
                absPath = this.fs.getAbsolutePath(node);
            }
        }

        if (!foundNode || !absPath) {
            return {
                output: `.: ${file}: No such file or directory`,
                newState: state,
                exitCode: 1 // 1 or 127
            };
        }

        const content = this.fs.readFile(absPath);

        if (context.executor) {
            let sourcedState = {
                ...state,
                callStackDepth: (state.callStackDepth || 0) + 1
            };

            // Update Positional Parameters if args provided
            if (args.length > 1) {
                const newEnv = { ...state.environment };
                // Set $1, $2, ...
                // Note: This destructively updates the environment for the caller too (as dot command logic dictates)
                // "The new positional parameters shall remain in effect when the dot utility completes."

                // Clear old positional params? (Heuristic: 1..9, or keep overwriting)
                // We'll clear 1-9 to be safe for now
                for (let i = 1; i <= 9; i++) {
                    delete newEnv[i.toString()];
                }

                // Set new ones
                for (let i = 1; i < args.length; i++) {
                    newEnv[i.toString()] = args[i];
                }
                // Update special params?
                newEnv['#'] = (args.length - 1).toString();
                // @ and * should be updated similarly
                const paramArgs = args.slice(1);
                newEnv['@'] = paramArgs.join(' ');
                newEnv['*'] = paramArgs.join(' ');

                sourcedState = { ...sourcedState, environment: newEnv };
            }

            const response = await context.executor.execute(content, sourcedState);

            // Handle RETURN logic
            if (response.controlFlow === 'RETURN') {
                return {
                    ...response,
                    controlFlow: undefined
                };
            }
            return response;
        }

        return {
            output: '.: executor not available',
            newState: state,
            exitCode: 1
        };
    }
}
