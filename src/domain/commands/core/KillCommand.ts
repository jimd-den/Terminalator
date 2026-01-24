/**
 * KillCommand.ts - Core Command
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * POSIX kill - Terminate or signal processes (IEEE Std 1003.1-2024)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Synopsis:
 *   kill [-s signal_name] pid...
 *   kill -l [exit_status]
 *   kill [-signal_name] pid...     (XSI)
 *   kill [-signal_number] pid...   (XSI)
 * 
 * The kill utility sends a signal to the specified processes.
 * 
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements ICommand, uses JobControlService.
 * 2. Literate Documentation: POSIX signal handling documented.
 * 3. Dependency Minimalism: Only domain entities and services.
 * 4. Telemetry: Signal delivery traced.
 * 5. Performance: O(n) for n PIDs specified.
 * 6. Universal Readability: Signal names match POSIX exactly.
 * 7. Pragmatic Patterns: Command pattern.
 * 8. SOLID / KISS: Focused on signal delivery.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import {
    SIGNALS,
    parseSignal,
    getSignalName,
    listSignals,
    DEFAULT_SIGNAL
} from '../../entities/Signal';

/**
 * KillCommand - Terminate or signal processes.
 * 
 * POSIX Exit Status:
 * - 0: Successful completion (signal sent or -l output written)
 * - >0: An error occurred
 */
export class KillCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    /**
     * Execute the kill command.
     * 
     * @param args - Options and PIDs/job specs
     * @param context - Process execution context
     * @param state - Terminal state
     * @returns Command response with output and exit code
     */
    execute(
        args: string[],
        context: ProcessContext,
        state: TerminalState
    ): CommandResponse {
        // Handle -l (list signals)
        if (args.includes('-l')) {
            return this.handleListSignals(args, state);
        }

        // Parse signal specification and targets
        const { signal, targets, error } = this.parseArgs(args);

        if (error) {
            return {
                output: error,
                newState: state,
                exitCode: 1
            };
        }

        // Must have at least one target
        if (targets.length === 0) {
            return {
                output: 'kill: missing operand',
                newState: state,
                exitCode: 1
            };
        }

        // Send signal to each target
        return this.sendSignals(targets, signal, context, state);
    }

    /**
     * Handle -l option: list signals or translate exit status.
     * 
     * POSIX:
     * - "kill -l" - Write all signal names
     * - "kill -l exit_status" - Write signal name for exit status
     * 
     * Pure function.
     */
    private handleListSignals(args: string[], state: TerminalState): CommandResponse {
        const idx = args.indexOf('-l');
        const exitStatus = args[idx + 1];

        if (exitStatus !== undefined && exitStatus !== '') {
            // Translate exit status to signal name
            let signalNum = parseInt(exitStatus, 10);
            if (isNaN(signalNum)) {
                return {
                    output: `kill: ${exitStatus}: invalid signal specification`,
                    newState: state,
                    exitCode: 1
                };
            }

            // If > 128, extract signal number from exit code
            if (signalNum > 128) {
                signalNum = signalNum - 128;
            }

            const name = getSignalName(signalNum);
            if (name) {
                return {
                    output: name,
                    newState: state,
                    exitCode: 0
                };
            }

            return {
                output: `kill: ${exitStatus}: invalid signal specification`,
                newState: state,
                exitCode: 1
            };
        }

        // List all signals
        // POSIX: signal names without SIG prefix, separated by space or newline
        const signals = listSignals();
        return {
            output: signals.join(' '),
            newState: state,
            exitCode: 0
        };
    }

    /**
     * Parse command arguments to extract signal and targets.
     * 
     * Handles:
     * - -s signal_name
     * - -SIGNAME or -signal_name (XSI)
     * - -number (XSI)
     * 
     * Pure function.
     */
    private parseArgs(args: string[]): {
        signal: number;
        targets: string[];
        error?: string;
    } {
        let signal = DEFAULT_SIGNAL;
        const targets: string[] = [];
        let i = 0;

        while (i < args.length) {
            const arg = args[i];

            if (arg === '-s' && i + 1 < args.length) {
                // -s signal_name
                const signalSpec = args[i + 1];
                const parsed = parseSignal(signalSpec);
                if (parsed === undefined) {
                    return { signal: 0, targets: [], error: `kill: ${signalSpec}: invalid signal specification` };
                }
                signal = parsed;
                i += 2;
            } else if (arg === '--') {
                // End of options
                targets.push(...args.slice(i + 1));
                break;
            } else if (arg.startsWith('-') && arg.length > 1 && arg !== '-') {
                // Could be -SIGNAL or -number
                const spec = arg.slice(1);

                // Try as signal name/number
                const parsed = parseSignal(spec);
                if (parsed !== undefined) {
                    signal = parsed;
                    i++;
                } else {
                    // Unknown option - but first check if it looks like a negative PID
                    // POSIX: "If the first argument is a negative integer, it shall
                    // be interpreted as a -signal_number option"
                    const num = parseInt(arg, 10);
                    if (!isNaN(num) && num < 0) {
                        // It's a negative number, treat as signal
                        const signalNum = -num;
                        if (getSignalName(signalNum) !== undefined) {
                            signal = signalNum;
                            i++;
                        } else {
                            return { signal: 0, targets: [], error: `kill: ${arg}: invalid signal specification` };
                        }
                    } else {
                        return { signal: 0, targets: [], error: `kill: ${arg}: invalid option` };
                    }
                }
            } else {
                // PID or job spec
                targets.push(arg);
                i++;
            }
        }

        return { signal, targets };
    }

    /**
     * Send signal to all targets.
     * 
     * @param targets - PIDs or job specs
     * @param signal - Signal number to send
     * @param context - Process context with job control
     * @param state - Terminal state
     */
    private sendSignals(
        targets: string[],
        signal: number,
        context: ProcessContext,
        state: TerminalState
    ): CommandResponse {
        const jobControl = context.jobControl;
        const errors: string[] = [];
        let anySuccess = false;

        for (const target of targets) {
            // Check for job spec (%...)
            if (target.startsWith('%')) {
                if (!jobControl) {
                    errors.push(`kill: ${target}: no job control in this shell`);
                    continue;
                }
                const result = jobControl.sendSignal(target, signal);
                if (result.success) {
                    anySuccess = true;
                } else {
                    errors.push(result.errorMessage ?? `kill: ${target}: no such job`);
                }
            } else {
                // PID - validate it's a number
                const pid = parseInt(target, 10);
                if (isNaN(pid)) {
                    errors.push(`kill: ${target}: arguments must be process or job IDs`);
                    continue;
                }

                // Try job control first for known PIDs
                if (jobControl) {
                    const result = jobControl.sendSignal(target, signal);
                    if (result.success) {
                        anySuccess = true;
                        continue;
                    }
                }

                // PID 0 = current process group (simulated success)
                // Negative PID = process group (simulated success)
                // Positive PID = specific process (simulated success)
                anySuccess = true;
            }
        }

        // POSIX: Exit 0 if signal was successfully processed for at least one target
        if (anySuccess) {
            return {
                output: errors.join('\n'),
                newState: state,
                exitCode: errors.length > 0 ? 1 : 0
            };
        }

        return {
            output: errors.join('\n') || 'kill: no process found',
            newState: state,
            exitCode: 1
        };
    }
}
