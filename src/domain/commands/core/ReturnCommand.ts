import { getStdinAsString } from '../../entities/ProcessContext';
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class ReturnCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        // POSIX: return [n]
        // If n omitted, return status is that of last command executed.
        let exitCode = state.lastExitCode || 0;

        if (args.length > 0) {
            const parsed = parseInt(args[0], 10);
            if (!isNaN(parsed)) {
                // Modulo 256
                exitCode = (parsed % 256 + 256) % 256;
            } else {
                // Invalid arg usually treated as 255 or error in some shells, or just 0?
                // POSIX says "if n is not a number... unspecified".
                // We'll mimic exit's robustness.
                // But typically 'return' with bad arg isn't fatal in sh.
                // We will return error code.
                return {
                    output: `return: ${args[0]}: numeric argument required`,
                    newState: state,
                    exitCode: 128
                    // Do NOT return controlFlow. Bash continues execution.
                };
            }
        }

        // POSIX: return should only be used in a function or sourced script.
        // We track this via state.callStackDepth (handled by ExecuteCommand and DotCommand).
        if (!state.callStackDepth || state.callStackDepth <= 0) {
            // Not in function or sourced script
            return {
                output: 'return: can only `return` from a function or sourced script',
                newState: state,
                exitCode: 1, // Generic error? Standard usually says "return: can only `return` from a function or sourced script" and exit code 1 or 2.
                // Test expected 1.
            };
        }
        // Assuming environment handles usage validity.

        return {
            output: '',
            newState: state,
            exitCode: exitCode,
            controlFlow: 'RETURN'
        };
    }
}
