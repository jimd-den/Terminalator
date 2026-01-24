/**
 * Job.ts - Domain Entity
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * POSIX Job Control Entity (IEEE Std 1003.1-2024, Section 2.11)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * A Job represents a shell pipeline or command that has been placed in the
 * background or suspended. Jobs are identified by a job number (e.g., %1, %2)
 * and are tracked by the shell for job control operations.
 * 
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Pure Entity with zero external dependencies.
 * 2. Literate Documentation: Each field is documented with POSIX rationale.
 * 3. Dependency Minimalism: Standard TypeScript only.
 * 4. Telemetry: N/A - pure data structure.
 * 5. Performance: O(1) property access.
 * 6. Universal Readability: Field names match POSIX terminology.
 * 7. Pragmatic Patterns: Simple immutable data structure.
 * 8. SOLID / KISS: Single Responsibility - job state only.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Job States as defined by POSIX jobs utility output.
 * 
 * POSIX STDOUT format specifies these <state> values:
 * - "Running"  : Job has not been suspended and has not exited
 * - "Stopped"  : Job was suspended by SIGTSTP, SIGSTOP, SIGTTIN, or SIGTTOU
 * - "Done"     : Job completed with exit status zero
 * - "Done(n)"  : Job completed with non-zero exit status n
 * 
 * We add "Terminated" for jobs killed by signals (POSIX: "visibly distinct")
 */
export type JobState = 'Running' | 'Stopped' | 'Done' | 'Terminated';

/**
 * Job Interface - Immutable representation of a shell job.
 * 
 * Follows the POSIX definition from XBD 3.182 (Job ID):
 * "A number that can be used to identify the job to the wait, fg, bg,
 * and kill utilities. Using these utilities, the job can be identified
 * by prefixing the job number with '%'."
 */
export interface Job {
    /**
     * Job ID number (1, 2, 3, ...).
     * 
     * Used in job ID notation: %1, %2, etc.
     * POSIX: "[%d]" in jobs output format.
     */
    readonly jobId: number;

    /**
     * Process ID of the job's process group leader.
     * 
     * For job-control background jobs, this is the PGID.
     * Used by `jobs -p` and `kill`.
     */
    readonly pid: number;

    /**
     * Process Group ID.
     * 
     * For job-control jobs, processes in the job share this PGID.
     * Signals can be sent to all processes in the group.
     */
    readonly pgid: number;

    /**
     * The command string as given to the shell.
     * 
     * POSIX: "<command>" - "The associated command that was given to the shell."
     * Displayed in jobs, bg, fg output.
     */
    readonly command: string;

    /**
     * Current state of the job.
     * 
     * Transitions:
     * - Running -> Stopped (by SIGTSTP, SIGSTOP, SIGTTIN, SIGTTOU)
     * - Stopped -> Running (by SIGCONT via bg/fg)
     * - Running/Stopped -> Done (normal exit)
     * - Running/Stopped -> Terminated (killed by signal)
     */
    state: JobState;

    /**
     * Exit code when job reaches Done or Terminated state.
     * 
     * - Done: 0 for success, 1-125 for errors
     * - Terminated: 128 + signal_number (convention)
     * 
     * Used by `wait` to report exit status.
     */
    exitCode?: number;

    /**
     * Signal that caused termination or stop, if applicable.
     * 
     * Stored for diagnostic messages: "Killed(SIGKILL)", "Stopped(SIGTSTP)"
     */
    signal?: number;

    /**
     * Is this the current job (+)?
     * 
     * POSIX: "The character '+' identifies the job that would be used as
     * a default for the fg or bg utilities."
     * 
     * Equivalent to %%  or %+
     */
    isCurrent: boolean;

    /**
     * Is this the previous job (-)?
     * 
     * POSIX: "The character '-' identifies the job that would become the
     * default if the current default job were to exit."
     * 
     * Equivalent to %-
     */
    isPrevious: boolean;
}

/**
 * Create a new Job with Running state.
 * 
 * Pure factory function - returns a new Job object.
 * 
 * @param jobId - The job ID number
 * @param pid - Process ID / PGID
 * @param command - The command string
 * @returns A new Job instance in Running state
 */
export function createJob(jobId: number, pid: number, command: string): Job {
    return {
        jobId,
        pid,
        pgid: pid,  // PGID typically equals PID of process group leader
        command,
        state: 'Running',
        exitCode: undefined,
        signal: undefined,
        isCurrent: false,
        isPrevious: false,
    };
}

/**
 * Format a job for `jobs` output (default format).
 * 
 * POSIX format: "[%d] %c %s %s\n", <job-number>, <current>, <state>, <command>
 * 
 * Pure function - formats job as string.
 * 
 * @param job - The job to format
 * @returns Formatted string for jobs output
 */
export function formatJob(job: Job): string {
    const current = job.isCurrent ? '+' : (job.isPrevious ? '-' : ' ');
    const stateStr = formatJobState(job);
    return `[${job.jobId}]${current} ${stateStr} ${job.command}`;
}

/**
 * Format a job for `jobs -l` output (long format with PID).
 * 
 * POSIX: "a field containing the process group ID shall be inserted
 * before the <state> field."
 * 
 * Pure function - formats job as string.
 * 
 * @param job - The job to format
 * @returns Formatted string for jobs -l output
 */
export function formatJobLong(job: Job): string {
    const current = job.isCurrent ? '+' : (job.isPrevious ? '-' : ' ');
    const stateStr = formatJobState(job);
    return `[${job.jobId}]${current} ${job.pgid} ${stateStr} ${job.command}`;
}

/**
 * Format job state for display.
 * 
 * POSIX specifies state strings:
 * - "Running"
 * - "Done" or "Done(code)" for non-zero
 * - "Stopped" or "Stopped (SIGTSTP)" etc.
 * 
 * Pure function.
 * 
 * @param job - The job to format state for
 * @returns State string
 */
export function formatJobState(job: Job): string {
    switch (job.state) {
        case 'Running':
            return 'Running';
        case 'Stopped':
            return 'Stopped';
        case 'Done':
            if (job.exitCode === 0 || job.exitCode === undefined) {
                return 'Done';
            }
            return `Done(${job.exitCode})`;
        case 'Terminated':
            return 'Terminated';
        default:
            return 'Unknown';
    }
}

/**
 * Format job for `bg` output.
 * 
 * POSIX: "[%d] %s\n", <job-number>, <command>
 * 
 * Pure function.
 * 
 * @param job - The job to format
 * @returns Formatted string for bg output
 */
export function formatJobForBg(job: Job): string {
    return `[${job.jobId}] ${job.command}`;
}

/**
 * Format job for `fg` output.
 * 
 * POSIX: "%s\n", <command>
 * 
 * Pure function.
 * 
 * @param job - The job to format
 * @returns Formatted string for fg output
 */
export function formatJobForFg(job: Job): string {
    return job.command;
}
