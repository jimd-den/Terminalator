/**
 * AwkErrors - fatal run-time errors and non-local control flow of awk programs.
 */

/** A fatal run-time error (exit status 2). */
export class AwkRuntimeError extends Error { }

/** `exit [expr]`: run END actions (unless already in END) and stop. */
export class AwkExit {
    constructor(readonly status: number | undefined) { }
}

/** `next`: stop processing the current record. */
export class AwkNext { }

/** `nextfile`: stop processing the current input file. */
export class AwkNextFile { }
