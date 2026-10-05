/**
 * M4Types - data types shared by the m4 processor and its builtins.
 */

/** A collected macro argument; `builtin` is set when it is a lone builtin token (from defn). */
export interface Arg {
    text: string;
    builtin?: string;
}

export type Definition = { text: string } | { builtin: string };

/** Services from the surrounding system (file system, processes). */
export interface M4Host {
    /** Reads a file for include/undivert, searching the include path. */
    readFile(name: string): { ok: true; data: string } | { ok: false; error: string };
    /** Runs `sh -c command` and returns its exit status and standard output. */
    shell(command: string): Promise<{ status: number; output: string }>;
    /** Creates a new file from a template whose trailing X's are replaced. */
    mkstemp(template: string): { ok: true; name: string } | { ok: false; error: string };
}

export interface M4Options {
    prefixBuiltins?: boolean;
    traditional?: boolean;
    quiet?: boolean;
    fatalWarnings?: boolean;
    syncLines?: boolean;
}

/** Thrown to stop processing (m4exit, fatal errors). */
export class M4Exit {
    constructor(readonly status: number) { }
}
