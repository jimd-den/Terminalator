/**
 * AwkHost - the operating-system services the awk interpreter needs (port).
 * AwkCommand adapts the process context (file system, streams, spawn) to it,
 * keeping the language engine independent of the shell and file system.
 */
export type ReadResult = { ok: true; data: string } | { ok: false; error: string; directory?: boolean };

export interface AwkHost {
    writeStdout(data: string): void;
    writeStderr(data: string): void;
    /** All of standard input; called at most once. */
    readStdin(): string;
    /** Reads a file (errors use strerror wording, e.g. "No such file or directory"). */
    readFile(path: string): ReadResult;
    /** Truncates/creates (`append` false) or appends to a file; returns an error message or null. */
    writeFile(path: string, data: string, append: boolean): string | null;
    /**
     * Runs `sh -c command`. With `capture` its standard output is returned,
     * otherwise it goes to awk's standard output. Resolves to its exit status.
     */
    run(command: string, options: { stdin?: string; capture?: boolean }): Promise<{ status: number; output: string }>;
    /** Environment for ENVIRON. */
    readonly environ: Record<string, string>;
    /** Seconds since the epoch (srand() default seed). */
    now(): number;
}
