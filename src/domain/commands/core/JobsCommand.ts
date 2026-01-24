/**
 * JobsCommand.ts - Core Command
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * POSIX jobs - Display status of jobs (IEEE Std 1003.1-2024)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Synopsis: jobs [-l|-p] [job_id...]
 * 
 * The jobs utility displays the status of background jobs that were created
 * in the current shell execution environment. When jobs reports the termination
 * status of a job, the shell removes the job from the background jobs list.
 * 
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements ICommand, uses JobControlService.
 * 2. Literate Documentation: POSIX output formats documented.
 * 3. Dependency Minimalism: Only domain entities and services.
 * 4. Telemetry: Results traced.
 * 5. Performance: O(n) where n = number of jobs.
 * 6. Universal Readability: Output matches POSIX specification exactly.
 * 7. Pragmatic Patterns: Command pattern.
 * 8. SOLID / KISS: Single responsibility - list jobs.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Job, formatJob, formatJobLong } from '../../entities/Job';
import { FileSystemService } from '../../services/FileSystemService';

/**
 * JobsCommand - Display status of jobs.
 * 
 * POSIX Exit Status:
 * - 0: Successful completion
 * - >0: An error occurred
 */
export class JobsCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    /**
     * Execute the jobs command.
     * 
     * POSIX Options:
     * - -l: Long format (include PIDs)
     * - -p: PIDs only
     * 
     * @param args - Options and job IDs
     * @param context - Process execution context
     * @param state - Terminal state  
     * @returns Command response with job listings
     */
    execute(
        args: string[],
        context: ProcessContext,
        state: TerminalState
    ): CommandResponse {
        // Check for job control service
        const jobControl = context.jobControl;

        // Parse options
        let longFormat = false;  // -l
        let pidsOnly = false;    // -p
        const jobSpecs: string[] = [];

        for (const arg of args) {
            if (arg === '-l') {
                longFormat = true;
            } else if (arg === '-p') {
                pidsOnly = true;
            } else if (arg === '-lp' || arg === '-pl') {
                // Combined options - -p takes precedence per typical behavior
                pidsOnly = true;
            } else if (arg.startsWith('-') && arg !== '-' && !arg.startsWith('%')) {
                // Unknown option (but allow %- for job spec)
                return {
                    output: `jobs: ${arg}: invalid option`,
                    newState: state,
                    exitCode: 1
                };
            } else {
                jobSpecs.push(arg);
            }
        }

        // If no job control, return empty (no jobs in this environment)
        if (!jobControl) {
            return {
                output: '',
                newState: state,
                exitCode: 0
            };
        }

        // Get jobs to display
        let jobs: Job[];
        if (jobSpecs.length > 0) {
            // Filter to specified jobs
            jobs = [];
            for (const spec of jobSpecs) {
                const job = jobControl.resolveJobSpec(spec);
                if (!job) {
                    return {
                        output: `jobs: ${spec}: no such job`,
                        newState: state,
                        exitCode: 1
                    };
                }
                jobs.push(job);
            }
        } else {
            // All jobs
            jobs = [...jobControl.getAllJobs()];
        }

        // Format output based on options
        const output = this.formatOutput(jobs, pidsOnly, longFormat);

        // After reporting, completed jobs should be reaped
        // (but we leave that to the shell's command loop, not here)

        return {
            output,
            newState: state,
            exitCode: 0
        };
    }

    /**
     * Format jobs for output.
     * 
     * POSIX Output Formats:
     * - Default: "[%d] %c %s %s\n", <job-number>, <current>, <state>, <command>
     * - -l: Adds PID before state
     * - -p: "%d\n", <process ID>
     * 
     * Pure function.
     */
    private formatOutput(jobs: Job[], pidsOnly: boolean, longFormat: boolean): string {
        if (jobs.length === 0) {
            return '';
        }

        if (pidsOnly) {
            // -p: Just PIDs, one per line
            return jobs.map(j => String(j.pgid)).join('\n');
        }

        if (longFormat) {
            // -l: Long format with PIDs
            return jobs.map(j => formatJobLong(j)).join('\n');
        }

        // Default format
        return jobs.map(j => formatJob(j)).join('\n');
    }
}
