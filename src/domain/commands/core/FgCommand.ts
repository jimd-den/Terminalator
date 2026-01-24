/**
 * FgCommand.ts - Core Command
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * POSIX fg - Run jobs in the foreground (IEEE Std 1003.1-2024)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Synopsis: fg [job_id]
 * 
 * The fg utility moves a background job in the current execution environment
 * into the foreground. Using fg to place a job into the foreground removes
 * its process ID from the list of those "known in the current shell execution
 * environment".
 * 
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements ICommand, uses JobControlService.
 * 2. Literate Documentation: POSIX requirements documented inline.
 * 3. Dependency Minimalism: Only domain entities and services.
 * 4. Telemetry: Operation results logged.
 * 5. Performance: O(1) for job resolution.
 * 6. Universal Readability: Clear variable names following POSIX terminology.
 * 7. Pragmatic Patterns: Command pattern.
 * 8. SOLID / KISS: Single responsibility - bring job to foreground.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { formatJobForFg } from '../../entities/Job';

/**
 * FgCommand - Run jobs in the foreground.
 * 
 * POSIX Exit Status:
 * - If fg succeeds, it does not return an exit status (shell waits for job)
 * - >0: An error occurred
 * 
 * In our simulation, since we can't actually block, we return 0 on success.
 */
export class FgCommand implements ICommand {
    /**
     * Execute the fg command.
     * 
     * POSIX: "If no job_id operand is given, the job_id for the job that
     * was most recently suspended, placed in the background, or run as
     * a background job shall be used."
     * 
     * @param args - Job ID to bring to foreground (optional)
     * @param context - Process execution context
     * @param state - Terminal state
     * @returns Command response with output and exit code
     */
    async execute(
        args: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        // Check for job control service
        const jobControl = context.jobControl;
        if (!jobControl) {
            // Job control is disabled or not available
            return {
                output: 'fg: no job control in this shell',
                newState: state,
                exitCode: 1
            };
        }

        // Parse arguments - fg takes at most one job_id per POSIX
        const jobSpecs = args.filter(arg => !arg.startsWith('-'));

        // Handle --help extension
        if (args.includes('--help')) {
            return {
                output: this.getHelp(),
                newState: state,
                exitCode: 0
            };
        }

        // Check for multiple arguments (POSIX allows only one)
        if (jobSpecs.length > 1) {
            return {
                output: 'fg: too many arguments',
                newState: state,
                exitCode: 1
            };
        }

        // Get the job spec (or undefined for current job)
        const spec = jobSpecs.length > 0 ? jobSpecs[0] : undefined;

        // Resume job in foreground
        const result = jobControl.resumeForeground(spec);

        if (!result.success) {
            return {
                output: result.errorMessage ?? 'fg: no current job',
                newState: state,
                exitCode: 1
            };
        }

        if (result.job) {
            // POSIX output: "%s\n", <command>
            return {
                output: formatJobForFg(result.job),
                newState: state,
                exitCode: result.job.exitCode ?? 0
            };
        }

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }

    /**
     * Generate help text.
     */
    private getHelp(): string {
        return `fg - run jobs in the foreground

Usage: fg [job_id]

Move a background job to the foreground.
If no job_id is given, the current job is used.

Job ID formats:
  %n      - Job number n
  %% or %+ - Current job
  %-      - Previous job
  %str    - Job starting with str`;
    }
}
