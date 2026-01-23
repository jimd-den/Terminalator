import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class DateCommand implements ICommand {
    name = 'date';
    description = 'Display the current time';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse | Promise<CommandResponse> {
        let date = new Date();
        let format = '';
        let utc = false;
        let setDateAttempt = false;

        // Robust argument parsing
        for (const arg of args) {
            if (arg === '-u') {
                utc = true;
            } else if (arg.startsWith('+')) {
                // If format is already set, POSIX says undefined behavior? Usually last one wins or first one?
                // Bash uses last one. We'll overwrite.
                format = arg.substring(1);
            } else if (arg.startsWith('-')) {
                return {
                    output: `date: invalid option -- '${arg}'`,
                    exitCode: 1,
                    newState: state
                };
            } else {
                // Operand that doesn't start with + is an attempt to set time (e.g. "MMDDhhmm")
                setDateAttempt = true;
            }
        }

        if (setDateAttempt) {
            return {
                output: 'date: cannot set date (permission denied or not implemented)',
                exitCode: 1,
                newState: state
            };
        }

        const p = (n: number) => n.toString().padStart(2, '0');

        if (!format) {
            // Default POSIX-like output
            // e.g. "Fri Jan 23 14:13:32 GMT 2026" (Not exact POSIX default "Tue Jun 26 09:58:53 PDT 1990")
            // JS default toString includes timezone name in parens.
            // Tests check basic output or specific format.
            // For now, return JS toString.
            return {
                output: utc ? date.toUTCString() : date.toString(),
                exitCode: 0,
                newState: state
            };
        }

        let output = format;

        const year = utc ? date.getUTCFullYear() : date.getFullYear();
        const month = utc ? date.getUTCMonth() + 1 : date.getMonth() + 1;
        const day = utc ? date.getUTCDate() : date.getDate();
        const hours = utc ? date.getUTCHours() : date.getHours();
        const minutes = utc ? date.getUTCMinutes() : date.getMinutes();
        const seconds = utc ? date.getUTCSeconds() : date.getSeconds();

        // Replacements - expand as needed for compliance
        output = output.replace(/%Y/g, year.toString());
        output = output.replace(/%y/g, year.toString().slice(-2));
        output = output.replace(/%m/g, p(month));
        output = output.replace(/%d/g, p(day));
        output = output.replace(/%H/g, p(hours));
        output = output.replace(/%M/g, p(minutes));
        output = output.replace(/%S/g, p(seconds));
        // Literal %
        output = output.replace(/%%/g, '%');

        return {
            output: output,
            exitCode: 0,
            newState: state
        };
    }
}
