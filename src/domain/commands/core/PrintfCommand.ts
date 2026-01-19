/**
 * PrintfCommand - Core Command
 *
 * Write formatted output.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Format and print data.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class PrintfCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        if (args.length === 0) {
            return { output: 'printf: usage: printf format [arguments...]', newState: state, exitCode: 1 };
        }

        const format = args[0];
        const params = args.slice(1);
        let output = '';
        let paramIndex = 0;

        // Simple loop to handle format reuse if more params than specs
        // Loop at least once
        do {
            const startParamIndex = paramIndex;
            let i = 0;
            // Unescape the format string first?
            // POSIX: interpreted sequences like \n, \t
            let currentFormat = this.unescape(format);
            // Actually, we should parse % specifiers and consume params.
            // But we must also unescape.
            // Let's iterate through the unescaped string looking for %.
            // Note: \\ is escape for backslash. %% is escape for %.

            let result = '';
            for (let j = 0; j < currentFormat.length; j++) {
                if (currentFormat[j] === '%' && currentFormat[j + 1] !== '%') {
                    // Specifier found
                    const spec = currentFormat[j + 1]; // Simplified: assume 1 char spec like %s, %d. No width/precision yet.
                    // TODO: Improve specifier parsing for flags/width/precision.
                    let replacement = '';

                    if (paramIndex < params.length) {
                        const arg = params[paramIndex++];
                        if (spec === 's') {
                            replacement = arg;
                        } else if (spec === 'd' || spec === 'i') {
                            const val = parseInt(arg);
                            replacement = isNaN(val) ? '0' : val.toString();
                        } else {
                            // Unsupported spec, ignore or print literal?
                            replacement = `%${spec}`;
                            paramIndex--; // didn't consume arg
                        }
                    } else {
                        // Missing arg: empty string for %s, 0 for %d
                        if (spec === 's') replacement = '';
                        else if (spec === 'd' || spec === 'i') replacement = '0';
                    }
                    result += replacement;
                    j++; // Skip spec char
                } else if (currentFormat[j] === '%' && currentFormat[j + 1] === '%') {
                    result += '%';
                    j++;
                } else {
                    result += currentFormat[j];
                }
            }
            if (paramIndex === 0 && params.length > 0 && result === currentFormat) {
                // Optimization: If format has no specifiers, it just prints the format string. 
                // If we have args left, normally we'd loop forever printing the format string.
                // POSIX says "results are unspecified", usually we stop.
                break;
            }

            // Infinite loop protection: If we didn't consume any params this iteration,
            // and we still have params left, we must break to avoid hanging.
            if (paramIndex === startParamIndex && paramIndex < params.length) {
                break;
            }

            output += result;

        } while (paramIndex < params.length);

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }

    private unescape(str: string): string {
        return str
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\')
            .replace(/\\'/g, '\'')
            .replace(/\\"/g, '"');
    }
}
