/**
 * Signal.ts - Domain Entity
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * POSIX Signal Definitions (IEEE Std 1003.1-2024)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This module defines POSIX signals as specified in <signal.h>. Signals are
 * the primary mechanism for inter-process communication and process control
 * in Unix-like systems.
 * 
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Pure Entity with zero external dependencies.
 * 2. Literate Documentation: Each signal is documented with its purpose.
 * 3. Dependency Minimalism: Standard TypeScript only.
 * 4. Telemetry: N/A - pure data structure.
 * 5. Performance: O(1) lookups via object properties.
 * 6. Universal Readability: Signal names match POSIX exactly.
 * 7. Pragmatic Patterns: Simple lookup table pattern.
 * 8. SOLID / KISS: Single Responsibility - signal definitions only.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * POSIX Signal Numbers
 * 
 * Signal numbers are implementation-defined, but POSIX requires certain
 * signals to exist. These values follow common Unix conventions (Linux).
 * 
 * The kill utility uses signal names WITHOUT the SIG prefix per POSIX:
 * "Values of signal_name shall be recognized... without the SIG prefix"
 */
export const SIGNALS: Record<string, number> = {
    // === Required Signals (POSIX Base) ===
    HUP: 1,   // Hangup - terminal disconnect or controlling process death
    INT: 2,   // Interrupt - interactive attention (Ctrl+C)
    QUIT: 3,   // Quit - interactive termination with core dump
    ILL: 4,   // Illegal Instruction
    TRAP: 5,   // Trace/breakpoint trap
    ABRT: 6,   // Abnormal termination (abort())
    BUS: 7,   // Bus error - memory access violation
    FPE: 8,   // Floating-point exception
    KILL: 9,   // Kill - cannot be caught or ignored
    USR1: 10,  // User-defined signal 1
    SEGV: 11,  // Segmentation violation
    USR2: 12,  // User-defined signal 2
    PIPE: 13,  // Write to pipe with no readers
    ALRM: 14,  // Alarm clock (timer)
    TERM: 15,  // Termination - default signal for kill

    // === Job Control Signals ===
    STOP: 19,  // Stop process - cannot be caught or ignored
    TSTP: 20,  // Terminal stop (Ctrl+Z)
    CONT: 18,  // Continue if stopped
    CHLD: 17,  // Child status changed
    TTIN: 21,  // Background read from terminal
    TTOU: 22,  // Background write to terminal

    // === Extended Signals (XSI) ===
    URG: 23,  // Urgent data on socket
    XCPU: 24,  // CPU time limit exceeded
    XFSZ: 25,  // File size limit exceeded
    VTALRM: 26,  // Virtual timer expired
    PROF: 27,  // Profiling timer expired
    WINCH: 28,  // Window size change
    IO: 29,  // I/O possible (async I/O)
    PWR: 30,  // Power failure
    SYS: 31,  // Bad system call
} as const;

/**
 * Reverse lookup: signal number to signal name.
 * 
 * Pure function - no side effects, deterministic output.
 * 
 * @param signalNumber - The numeric signal value
 * @returns The signal name (without SIG prefix) or undefined
 */
export function getSignalName(signalNumber: number): string | undefined {
    for (const [name, num] of Object.entries(SIGNALS)) {
        if (num === signalNumber) {
            return name;
        }
    }
    return undefined;
}

/**
 * Parse a signal specification to a numeric value.
 * 
 * POSIX kill allows:
 * - Signal name (case-insensitive, without SIG prefix): "TERM", "term", "kill"
 * - Signal number as string: "15", "9"
 * - Special value "0": test process existence without sending signal
 * 
 * Pure function - no side effects, deterministic output.
 * 
 * @param spec - The signal specification (name or number string)
 * @returns The numeric signal value, or undefined if invalid
 */
export function parseSignal(spec: string): number | undefined {
    // Handle numeric specification
    const numericValue = parseInt(spec, 10);
    if (!isNaN(numericValue) && numericValue >= 0) {
        // Signal 0 is valid (used for process existence check)
        if (numericValue === 0) return 0;
        // Verify it's a known signal number
        if (getSignalName(numericValue) !== undefined) return numericValue;
        // Allow any valid number (implementation may support more)
        if (numericValue <= 64) return numericValue;
        return undefined;
    }

    // Handle name specification (case-insensitive, without SIG prefix)
    const upperName = spec.toUpperCase();
    // Remove SIG prefix if present (for robustness)
    const normalizedName = upperName.startsWith('SIG')
        ? upperName.slice(3)
        : upperName;

    return SIGNALS[normalizedName];
}

/**
 * Get list of all signal names for `kill -l` output.
 * 
 * POSIX specifies: "Write all values of signal_name supported by the
 * implementation... without the SIG prefix... separator shall be either
 * a <newline> or a <space>."
 * 
 * Pure function - returns consistent ordered list.
 * 
 * @returns Array of signal names in numeric order
 */
export function listSignals(): string[] {
    return Object.entries(SIGNALS)
        .sort(([, a], [, b]) => a - b)
        .map(([name]) => name);
}

/**
 * Default signal for termination (SIGTERM).
 * 
 * POSIX kill: "The sig argument... or by SIGTERM, if none of these
 * options is specified."
 */
export const DEFAULT_SIGNAL = SIGNALS.TERM;

/**
 * Signals that cannot be caught or ignored.
 * 
 * POSIX specifies that SIGKILL and SIGSTOP cannot be caught,
 * blocked, or ignored. This affects job control behavior.
 */
export const UNCATCHABLE_SIGNALS = [SIGNALS.KILL, SIGNALS.STOP] as const;
