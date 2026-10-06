/**
 * TerminalState Entity - Domain Layer
 * 
 * Manages the interactive state of the simulated terminal.
 * Includes command history, current directory, and environment variables.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture) - Entities
 * Pillar: The Balanced Scale (SOLID / KISS) - Immutable State Pattern
 *
 * Intent:
 * Holds the snapshot of the user's session.
 * Used by commands to determine context and by the UI to render the prompt.
 */

import { FileSystem } from './FileSystem';


export interface TerminalState {
    currentDirectory: string;
    history: string[];
    environment: Record<string, string>;
    aliases: Record<string, string>;
    user: { uid: number, gid: number, groups: number[] };
    lastExitCode: number;
    functions: Map<string, any>; // FunctionDefNode
    traps: Map<string, string>; // Signal -> Command
    callStackDepth: number;
    fsContext?: string; // Hostname of active remote system

    // --- POSIX shell session state (optional for backward compatibility) ---
    /** $1..$n */
    positionalParams?: string[];
    /** $0 when running a script or `sh -c` */
    scriptName?: string;
    /** `set -o` options (errexit, nounset, noclobber, ...) */
    shellOptions?: Record<string, boolean>;
    /** Names carrying the export attribute; undefined = legacy (all exported). */
    exportedVars?: string[];
    readonlyVars?: string[];
    /** $$ */
    shellPid?: number;
    /** $! */
    lastBackgroundPid?: number;
    /** Nice value of the shell (inherited by the commands it runs). */
    niceIncrement?: number;
    /** File mode creation mask (umask). */
    umask?: number;
    /** Resource limits set with ulimit, keyed by option letter (null = unlimited). */
    limits?: Record<string, { soft: number | null; hard: number | null }>;
    /** Saved values for `local` variables, one frame per active function call (null = was unset). */
    localFrames?: Array<Record<string, string | null>>;
}

/**
 * Creates the initial state for a new terminal session.
 *
 * @returns A default TerminalState object.
 */
export const createInitialTerminalState = (): TerminalState => {
    // Note: FS is typically injected or created.
    // In production, FS is usually a singleton or passed in.
    // For test harness compat, we might need to rely on the passed in state having FS,
    // or the harness injecting it.
    // The harness in `posix_comprehensive_suite.ts` does:
    // const testFs = new FileSystem();
    // const testExecutor = new ExecuteCommand(testFs);
    // const testState = createInitialTerminalState();
    // The test executor might not be attaching `fs` to `state`.
    // We should check `ExecuteCommand.ts`.

    return {
        currentDirectory: '/home/operator',
        history: [],
        environment: {
            PATH: '/usr/local/bin:/usr/bin:/bin',
            USER: 'operator',
            LOGNAME: 'operator',
            PWD: '/home/operator',
            LANG: 'C.UTF-8',
            HOME: '/home/operator',
            SHELL: '/bin/sh',
            TERM: 'xterm-256color',
        },
        aliases: {
            'll': 'ls -l',
            'la': 'ls -a'
        },
        user: { uid: 1000, gid: 1000, groups: [1000, 1001, 100] },
        lastExitCode: 0,
        functions: new Map(),
        traps: new Map(),
        callStackDepth: 0,
        positionalParams: [],
        shellOptions: {},
        exportedVars: ['PATH', 'USER', 'HOME', 'SHELL', 'TERM', 'LOGNAME', 'PWD', 'LANG'],
        readonlyVars: [],
        shellPid: 4242
    };
}
