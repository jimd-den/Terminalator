/**
 * EchoCommand - Core Command
 *
 * Writes arguments to standard output.
 * Adheres to POSIX Std 1003.1-2024 (XSI Option).
 *
 * Pillar: The Four-Fold Shield (Strict Architecture) - Use Cases/Command
 * Pillar: The Swift Stream (Performance & Purity) - Pure escape processing
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Provides a POSIX-compliant implementation of the echo utility.
 * In accordance with XSI requirements, it supports escape sequences within arguments.
 * It does NOT support any options (like -n), as per POSIX Guideline 10 and Issue 8.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

/**
 * Pure function to process XSI escape sequences in a string.
 * returns { result: string, suppressNewline: boolean, truncate: boolean }
 */
export const processEscapeSequences = (input: string): { result: string, suppressNewline: boolean, truncate: boolean } => {
    let result = '';
    let suppressNewline = false;
    let truncate = false;

    for (let i = 0; i < input.length; i++) {
        if (input[i] === '\\' && i + 1 < input.length) {
            const next = input[i + 1];
            switch (next) {
                case 'a': result += '\x07'; i++; break; // Alert
                case 'b': result += '\b'; i++; break;   // Backspace
                case 'c':
                    suppressNewline = true;
                    truncate = true;
                    i++;
                    return { result, suppressNewline, truncate };
                case 'f': result += '\f'; i++; break;   // Form-feed
                case 'n': result += '\n'; i++; break;   // Newline
                case 'r': result += '\r'; i++; break;   // Carriage-return
                case 't': result += '\t'; i++; break;   // Tab
                case 'v': result += '\v'; i++; break;   // Vertical-tab
                case '\\': result += '\\'; i++; break;  // Backslash
                case '0': {
                    // Octal: \0num (up to 3 octal digits)
                    let octalStr = '';
                    let j = i + 2;
                    while (j < input.length && j < i + 5 && /[0-7]/.test(input[j])) {
                        octalStr += input[j];
                        j++;
                    }
                    if (octalStr.length > 0) {
                        result += String.fromCharCode(parseInt(octalStr, 8));
                        i = j - 1;
                    } else {
                        // Just \0
                        result += '\0';
                        i++;
                    }
                    break;
                }
                default:
                    // POSIX results are implementation-defined if backslash followed by other char.
                    // We'll treat it as literal backslash + char.
                    result += '\\';
                    break;
            }
        } else {
            result += input[i];
        }
    }

    return { result, suppressNewline, truncate };
};

export class EchoCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    /**
     * Executes the echo command.
     */
    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
        const timestamp = new Date().toISOString();
        this.log(`[${timestamp}] EchoCommand.execute(args=${JSON.stringify(args)})`);

        // POSIX: "The echo utility shall not recognize the '--' argument... or any options"
        // Everything passed in 'args' is treated as a string to be printed.

        let combinedOutput = '';
        let suppressNewline = false;

        for (let i = 0; i < args.length; i++) {
            const { result, suppressNewline: sn, truncate } = processEscapeSequences(args[i]);

            combinedOutput += result;

            if (truncate) {
                suppressNewline = true;
                break;
            }

            // Append space between arguments if not the last one and not truncated
            if (i < args.length - 1) {
                combinedOutput += ' ';
            }
        }

        const finalOutput = suppressNewline ? combinedOutput : combinedOutput + '\n';

        this.log(`[${new Date().toISOString()}] EchoCommand.execute returns exitCode=0`);
        return {
            output: finalOutput,
            newState: state,
            exitCode: 0
        };
    }

    private log(message: string) {
        // Observability hook
    }
}
