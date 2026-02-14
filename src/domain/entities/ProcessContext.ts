import { FileSystem } from './FileSystem';
import { FileSystemService } from '../services/FileSystemService';
import { IShellExecutor } from '../interfaces/IShellExecutor';
import { IStream } from './Stream';
import { JobControlService } from '../services/JobControlService';
import { NetworkMap } from '../services/NetworkMap';
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
     * Economy Service for transactions (e.g., buy, mine)
     */
    economy?: EconomyService;
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


