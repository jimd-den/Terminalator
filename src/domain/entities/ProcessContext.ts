/**
 * ProcessContext Entity - Domain Layer
 * 
 * Represents the execution context of a process/command.
 * Encapsulates environment variables, working directory, and I/O streams.
 */

export interface ProcessContext {
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
    user: string;

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
}
