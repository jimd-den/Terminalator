import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * XargsCommand - Core Command (POSIX Compliant)
 *
 * Constructs argument lists and invokes utility.
 * Implements: -E, -I, -L, -n, -p, -r, -s, -t, -x, -0
 *
 * Pillar: The Four-Fold Shield (Clean Architecture - Interface Adapter)
 * Pillar: The Storyteller's Code (Literate Documentation)
 *
 * Reference: IEEE Std 1003.1-2024 (SUSv5) - xargs utility
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { NullStream, StringStream } from '../../entities/Stream';
import { CommandResponse } from '../../entities/Command';


/**
 * Options state for xargs execution.
 * Maps directly to POSIX-defined options.
 */
interface XargsOptions {
    eofStr?: string;        // -E: Logical end-of-file string
    replStr?: string;       // -I: Insert mode replacement string
    linesPerInvoke?: number; // -L: Lines per invocation (XSI)
    maxArgs?: number;       // -n: Maximum arguments per invocation
    maxSize: number;        // -s: Maximum command line size (default LINE_MAX)
    prompt: boolean;        // -p: Prompt mode
    noRunIfEmpty: boolean;  // -r: Don't run if no input
    trace: boolean;         // -t: Trace mode (print to stderr)
    exitIfTooLong: boolean; // -x: Exit if command too long
    nullDelim: boolean;     // -0: Null byte delimiter
}

const LINE_MAX = 2048; // POSIX minimum for LINE_MAX

export class XargsCommand implements ICommand {
    private getCommand: (name: string) => ICommand | undefined;

    constructor(private fs: FileSystemService, commandLookup: (name: string) => ICommand | undefined) {
        this.getCommand = commandLookup;
    }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = getStdinAsString(context);

        // Parse options and extract utility/arguments
        const { opts, utility, utilityArgs } = this.parseOptions(args);

        // Get input - if undefined, treat as empty
        const inputStr = input ?? '';

        // Parse input into tokens based on delimiter mode
        let tokens: string[];
        if (opts.nullDelim) {
            tokens = this.parseInputNull(inputStr, opts.eofStr);
        } else {
            tokens = this.parseInputStandard(inputStr, opts.eofStr);
        }

        // -r: If no arguments from input and -r specified, don't run
        if (tokens.length === 0 && opts.noRunIfEmpty) {
            return { output: '', newState: state, exitCode: 0 };
        }

        // Default: if no input and no -r, run utility once with no extra args
        if (tokens.length === 0) {
            return this.executeBatch(utility, utilityArgs, [], opts, context, state);
        }

        // Batch arguments based on options
        const batches = this.batchArgs(tokens, utilityArgs, opts);

        // Execute batches
        let output = '';
        let traceOutput = '';
        let lastExitCode = 0;
        let highestErrorCode = 0;

        for (const batch of batches) {
            const result = await this.executeBatch(utility, utilityArgs, batch, opts, context, state);

            if (result.exitCode === 255) {
                // Exit 255 signals xargs to stop
                return {
                    output: traceOutput + output + result.output,
                    newState: state,
                    exitCode: 1
                };
            }

            // Track highest error code (126/127 are special)
            if (result.exitCode === 126 || result.exitCode === 127) {
                highestErrorCode = result.exitCode;
            } else if (result.exitCode !== 0 && highestErrorCode < 126) {
                highestErrorCode = result.exitCode;
            }

            output += result.output;
            if (result.traceOutput) {
                traceOutput += result.traceOutput;
            }
            lastExitCode = result.exitCode;
        }

        // Return: 127 if cmd not found, 126 if couldn't invoke, else 0 or 1-125
        const finalExitCode = highestErrorCode >= 126 ? highestErrorCode : (highestErrorCode > 0 ? 1 : 0);
        return {
            output: traceOutput + output,
            newState: state,
            exitCode: finalExitCode
        };
    }

    /**
     * Parse command line options per POSIX xargs specification.
     */
    private parseOptions(args: string[]): { opts: XargsOptions, utility: string, utilityArgs: string[] } {
        const opts: XargsOptions = {
            maxSize: LINE_MAX,
            prompt: false,
            noRunIfEmpty: false,
            trace: false,
            exitIfTooLong: false,
            nullDelim: false
        };

        let i = 0;
        while (i < args.length) {
            const arg = args[i];

            if (arg === '-E' && i + 1 < args.length) {
                opts.eofStr = args[++i];
            } else if (arg === '-I' && i + 1 < args.length) {
                opts.replStr = args[++i];
                opts.exitIfTooLong = true; // -I forces -x
            } else if (arg === '-L' && i + 1 < args.length) {
                opts.linesPerInvoke = parseInt(args[++i], 10);
            } else if (arg === '-n' && i + 1 < args.length) {
                opts.maxArgs = parseInt(args[++i], 10);
            } else if (arg === '-s' && i + 1 < args.length) {
                opts.maxSize = parseInt(args[++i], 10);
            } else if (arg === '-p') {
                opts.prompt = true;
                opts.trace = true; // -p implies -t
            } else if (arg === '-r') {
                opts.noRunIfEmpty = true;
            } else if (arg === '-t') {
                opts.trace = true;
            } else if (arg === '-x') {
                opts.exitIfTooLong = true;
            } else if (arg === '-0') {
                opts.nullDelim = true;
            } else if (arg === '--') {
                i++;
                break;
            } else if (arg.startsWith('-')) {
                // Handle combined options like -tr
                for (let j = 1; j < arg.length; j++) {
                    const c = arg[j];
                    if (c === 'p') { opts.prompt = true; opts.trace = true; }
                    else if (c === 'r') { opts.noRunIfEmpty = true; }
                    else if (c === 't') { opts.trace = true; }
                    else if (c === 'x') { opts.exitIfTooLong = true; }
                    else if (c === '0') { opts.nullDelim = true; }
                }
            } else {
                // First non-option is utility
                break;
            }
            i++;
        }

        // Remaining args: utility and its arguments
        const utility = args[i] || 'echo';
        const utilityArgs = args.slice(i + 1);

        return { opts, utility, utilityArgs };
    }

    /**
     * Parse input using standard xargs quoting rules.
     * - Double-quote and single-quote for quoting
     * - Backslash escapes any character
     * - Blanks and newlines are delimiters
     */
    private parseInputStandard(input: string, eofStr?: string): string[] {
        const tokens: string[] = [];
        let current = '';
        let inDouble = false;
        let inSingle = false;
        let escaped = false;

        for (let i = 0; i < input.length; i++) {
            const c = input[i];

            if (escaped) {
                current += c;
                escaped = false;
                continue;
            }

            if (c === '\\' && !inSingle) {
                escaped = true;
                continue;
            }

            if (c === '"' && !inSingle) {
                inDouble = !inDouble;
                continue;
            }

            if (c === "'" && !inDouble) {
                inSingle = !inSingle;
                continue;
            }

            if (!inDouble && !inSingle && (c === ' ' || c === '\t' || c === '\n')) {
                if (current.length > 0) {
                    // Check for EOF string
                    if (eofStr !== undefined && current === eofStr) {
                        return tokens;
                    }
                    tokens.push(current);
                    current = '';
                }
                continue;
            }

            current += c;
        }

        // Add final token if any
        if (current.length > 0) {
            if (eofStr !== undefined && current === eofStr) {
                return tokens;
            }
            tokens.push(current);
        }

        return tokens;
    }

    /**
     * Parse input using null-byte delimiter (-0 mode).
     * No quote processing; each argument separated by \0.
     */
    private parseInputNull(input: string, eofStr?: string): string[] {
        const tokens: string[] = [];
        const parts = input.split('\0');

        for (const part of parts) {
            if (part.length > 0) {
                if (eofStr !== undefined && part === eofStr) {
                    return tokens;
                }
                tokens.push(part);
            }
        }

        return tokens;
    }

    /**
     * Batch arguments according to -n, -s, -L, -I options.
     */
    private batchArgs(tokens: string[], baseArgs: string[], opts: XargsOptions): string[][] {
        // -I mode: one argument at a time, with replacement
        if (opts.replStr) {
            return tokens.map(t => [t]);
        }

        // -L mode: batch by lines (we treat each token as a "line" in simplified mode)
        if (opts.linesPerInvoke) {
            const batches: string[][] = [];
            for (let i = 0; i < tokens.length; i += opts.linesPerInvoke) {
                batches.push(tokens.slice(i, i + opts.linesPerInvoke));
            }
            return batches;
        }

        // -n mode: batch by max number of arguments
        if (opts.maxArgs) {
            const batches: string[][] = [];
            for (let i = 0; i < tokens.length; i += opts.maxArgs) {
                batches.push(tokens.slice(i, i + opts.maxArgs));
            }
            return batches;
        }

        // Default: -s mode (batch by size) or all at once
        const batches: string[][] = [];
        let currentBatch: string[] = [];
        let currentSize = baseArgs.reduce((a, b) => a + b.length + 1, 0);

        for (const token of tokens) {
            const tokenSize = token.length + 1; // +1 for null terminator

            if (currentSize + tokenSize > opts.maxSize && currentBatch.length > 0) {
                batches.push(currentBatch);
                currentBatch = [];
                currentSize = baseArgs.reduce((a, b) => a + b.length + 1, 0);
            }

            currentBatch.push(token);
            currentSize += tokenSize;
        }

        if (currentBatch.length > 0) {
            batches.push(currentBatch);
        }

        return batches.length > 0 ? batches : [[]];
    }

    /**
     * Execute a single batch of arguments.
     */
    private async executeBatch(
        utility: string,
        baseArgs: string[],
        batchArgs: string[],
        opts: XargsOptions,
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse & { traceOutput?: string }> {
        // Build final argument list
        let finalArgs: string[];

        if (opts.replStr) {
            // -I mode: replace replStr in baseArgs with the single batch arg
            const replacement = batchArgs[0] || '';
            finalArgs = baseArgs.map(arg => arg.split(opts.replStr!).join(replacement));
        } else {
            // Normal mode: append batch args to base args
            finalArgs = [...baseArgs, ...batchArgs];
        }

        // Find command
        const command = this.getCommand(utility);
        if (!command) {
            return {
                output: `xargs: ${utility}: No such file or directory\n`,
                newState: state,
                exitCode: 127
            };
        }

        // Trace output
        let traceOutput = '';
        if (opts.trace) {
            const cmdLine = [utility, ...finalArgs].join(' ');
            traceOutput = cmdLine + '\n';
        }

        // Prompt mode: in our simulated environment, always proceed
        // (Real implementation would read from /dev/tty)

        try {
            // Create clean context for inner command
            const innerContext: ProcessContext = {
                ...context,
                stdin: new NullStream(),
                stdout: new StringStream(),
                stderr: new StringStream(),
                stdinLegacy: undefined
            };

            const result = await command.execute(finalArgs, innerContext, state);

            return {
                ...result,
                traceOutput
            };
        } catch (e: any) {
            return {
                output: `xargs: ${utility}: ${e.message}\n`,
                newState: state,
                exitCode: 126,
                traceOutput
            };
        }
    }
}
