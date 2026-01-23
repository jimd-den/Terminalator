import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class ExitCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        // POSIX: If no argument, exit status is that of last command executed.
        let exitCode = state.lastExitCode || 0;

        if (args.length > 0) {
            const parsed = parseInt(args[0], 10);
            if (isNaN(parsed)) {
                // POSIX: If arg is not decimal int, behavior undefined.
                // Common shell behavior: exit with error code (e.g. 128 or 255) and print error.
                return {
                    output: `exit: ${args[0]}: numeric argument required`,
                    newState: state,
                    exitCode: 128, // Using 128 as standard error ref
                    controlFlow: 'EXIT'
                };
            } else {
                // POSIX: Exit status is n modulo 256.
                // JS % operator behaves strangely with negatives, but for shell typically Exit(0-255).
                // If negative? 'exit -1' -> 255.
                // (n % 256 + 256) % 256
                exitCode = (parsed % 256 + 256) % 256;
            }
        }

        // Trap handling would normally trigger here on shell level before process termination.
        // The return value 'controlFlow: EXIT' signals the shell to terminate, which should trigger traps.
        // We cannot execute traps INSIDE this command, as they are part of the shell environment.
        // The text output is empty unless error.

        return {
            output: '',
            newState: state,
            exitCode: exitCode,
            controlFlow: 'EXIT'
        };
    }
}
