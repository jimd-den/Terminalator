import { FileSystem } from './FileSystem';
import { FileSystemService } from '../services/FileSystemService';
import { IShellExecutor } from '../interfaces/IShellExecutor';
import { IStream } from './Stream';
import { JobControlService } from '../services/JobControlService';
import { NetworkMap } from '../services/NetworkMap';
import { ProcessTable } from './ProcessTable';
import { EconomyService } from '../services/EconomyService';

/**
 * ProcessContext Entity - Domain Layer
 * 
 * Represents the execution context of a process/command.
 * Encapsulates environment variables, running file system, working directory, and I/O streams.
 */

export interface ProcessContext {
    /**
     * FileSystem instance for this process (Local or Remote)
     */
    fs: FileSystem;

    /**
     * FileSystem Service for high-level operations
     */
    fileSystemService: FileSystemService;

    /**
     * Local FileSystem Service (always the primary workstation)
     */
    localFileSystemService?: FileSystemService;

    /**
     * Environment variables for the process
     */
    env: Record<string, string>;

    /**
     * Current Working Directory (absolute path)
     */
    cwd: string;

    /**
     * ID of the user running the process
     */
    user: { uid: number, gid: number, groups: number[] };

    /**
     * Input stream (stdin) - Stream abstraction for reading input
     */
    stdin: IStream;

    /**
     * Output stream (stdout) - Stream abstraction for writing output
     */
    stdout: IStream;

    /**
     * Error stream (stderr) - Stream abstraction for writing errors
     */
    stderr: IStream;

    /**
     * Legacy stdin string access (for backward compatibility during migration)
     * @deprecated Use stdin.read() instead
     */
    stdinLegacy?: string;

    /**
     * Shell executor for running sub-commands
     */
    executor?: IShellExecutor;

    /**
     * Job Control Service for managing background jobs.
     * 
     * Required for bg, fg, jobs, kill (job specs), wait commands.
     * Optional because not all contexts need job control (e.g., subshells).
     */
    jobControl?: JobControlService;

    /**
     * Network Map for cross-system operations (e.g., scp)
     */
    networkMap?: NetworkMap;

    /**
     * Whether stdout is the interactive terminal (isatty(1)). Utilities such
     * as `ls` change their format when writing to a pipe or file.
     * Undefined means unknown (treated as a terminal).
     */
    stdoutIsTty?: boolean;

    /** The name the utility was invoked as (argv[0]), e.g. `[` vs `test`. */
    argv0?: string;

    /**
     * Runs another utility as a child process (fork+exec): PATH search, no
     * shell functions. Its output goes to this process's stdout/stderr.
     * Resolves to the exit status (127 not found, 126 not executable).
     */
    spawn?: (argv: string[], options?: SpawnOptions) => Promise<number>;

    /** This process's id and the host's process table (ps, kill, nice...). */
    pid?: number;
    processes?: ProcessTable;

    /** Economy Service for transactions (e.g., buy, mine). */
    economy?: EconomyService;
}

export interface SpawnOptions {
    /** Complete environment for the child (default: this process's). */
    env?: Record<string, string>;
    /** Data for the child's standard input (default: inherited). */
    stdin?: string;
    /** Working directory (default: inherited). */
    cwd?: string;
    /** Nice value increment for the child (nice). */
    nice?: number;
    /** Captures the child's standard output here instead (e.g. awk's `cmd | getline`). */
    stdout?: IStream;
}


/**
 * Helper to get stdin as a string (backward compatibility).
 * Prefers stdinLegacy if available, otherwise reads from stdin stream.
 */
export function getStdinAsString(context: ProcessContext): string | undefined {
    if (context.stdinLegacy !== undefined) {
        return context.stdinLegacy;
    }
    const data = context.stdin.read();
    return data ?? undefined;
}


