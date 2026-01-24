/**
 * BgCommand.ts - Core Command
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * POSIX bg - Run jobs in the background (IEEE Std 1003.1-2024)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Synopsis: bg [job_id...]
 * 
 * The bg utility resumes suspended jobs from the current shell execution
 * environment by running them as background jobs. If the job specified is
 * already a running background job, bg shall have no effect and exit successfully.
 * 
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements ICommand, uses JobControlService.
 * 2. Literate Documentation: POSIX requirements documented inline.
 * 3. Dependency Minimalism: Only domain entities and services.
 * 4. Telemetry: Operation results logged.
 * 5. Performance: O(1) for single job, O(n) for multiple.
 * 6. Universal Readability: Clear variable names following POSIX terminology.
 * 7. Pragmatic Patterns: Command pattern.
 * 8. SOLID / KISS: Single responsibility - resume jobs in background.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { formatJobForBg } from '../../entities/Job';

/**
 * BgCommand - Resume jobs in the background.
 * 
 * POSIX Exit Status:
 * - 0: Successful completion
 * - >0: An error occurred
 */
export class BgCommand implements ICommand {
    /**
     * Execute the bg command.
     * 
     * POSIX: "If no job_id operand is given, the most recently suspended
     * job shall be used."
     * 
     * @param args - Job IDs to resume (optional)
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
                output: 'bg: no job control in this shell',
                newState: state,
                exitCode: 1
            };
        }

        // Parse arguments - filter out options (bg takes none per POSIX)
        const jobSpecs = args.filter(arg => !arg.startsWith('-'));

        // Handle --help extension
        if (args.includes('--help')) {
            return {
                output: this.getHelp(),
                newState: state,
                exitCode: 0
            };
        }

        // Check for invalid options
        const invalidOption = args.find(arg => arg.startsWith('-') && arg !== '--help');
        if (invalidOption) {
            return {
                output: `bg: ${invalidOption}: invalid option`,
                newState: state,
                exitCode: 1
            };
        }

        // If no job specified, use current job
        if (jobSpecs.length === 0) {
            return this.resumeSingleJob(jobControl, undefined, state);
        }

        // Resume each specified job
        const outputs: string[] = [];
        let exitCode = 0;

        for (const spec of jobSpecs) {
            const result = jobControl.resumeBackground(spec);

            if (!result.success) {
                outputs.push(result.errorMessage ?? `bg: ${spec}: no such job`);
                exitCode = 1;
            } else if (result.job) {
                // POSIX output: "[%d] %s\n", <job-number>, <command>
                outputs.push(formatJobForBg(result.job));
            }
        }

        return {
            output: outputs.join('\n'),
            newState: state,
            exitCode
        };
    }

    /**
     * Resume a single job (or current job if spec is undefined).
     * 
     * Pure helper function.
     */
    private resumeSingleJob(
        jobControl: NonNullable<ProcessContext['jobControl']>,
        spec: string | undefined,
        state: TerminalState
    ): CommandResponse {
        const result = jobControl.resumeBackground(spec);

        if (!result.success) {
            return {
                output: result.errorMessage ?? 'bg: no current job',
                newState: state,
                exitCode: 1
            };
        }

        if (result.job) {
            return {
                output: formatJobForBg(result.job),
                newState: state,
                exitCode: 0
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
        return `bg - run jobs in the background

Usage: bg [job_id...]

Resume suspended jobs by running them in the background.
If no job_id is given, the current job is used.

Job ID formats:
  %n      - Job number n
  %% or %+ - Current job
  %-      - Previous job
  %str    - Job starting with str`;
    }
}
