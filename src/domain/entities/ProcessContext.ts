import { FileSystem } from './FileSystem';
import { FileSystemService } from '../services/FileSystemService';
import { IShellExecutor } from '../interfaces/IShellExecutor';

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
     * Input stream (stdin) - Simple string buffer for now
     */
    stdin?: string;

    /**
     * Output stream (stdout) - Not implemented yet (Project Phase 2)
     */
    // stdout: WritableStream;

    /**
     * Error stream (stderr) - Not implemented yet (Project Phase 2)
     */
    // stderr: WritableStream;
    /**
     * Shell executor for running sub-commands
     */
    executor?: IShellExecutor;
}
