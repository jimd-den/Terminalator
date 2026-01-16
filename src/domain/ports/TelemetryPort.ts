/**
 * TelemetryPort - Domain Port
 *
 * Defines the contract for the telemetry and logging system.
 * Allows the domain to record events without depending on a specific implementation.
 *
 * Pillar: The Watchman’s Log (Telemetry)
 * Pillar: The Four-Fold Shield (Strict Architecture) - Dependency Inversion
 */

export interface TelemetryPort {
    /**
     * Traces the execution of a function, logging its start, end, result, and any error.
     *
     * @param fnName - The semantic name of the operation (e.g., 'MailSystem.sendMail').
     * @param fn - The function to execute.
     * @param args - Arguments to pass to the function (also logged as context).
     * @returns The result of the function execution.
     */
    trace<T>(fnName: string, fn: (...args: any[]) => T, ...args: any[]): T;

    /**
     * Logs an informational message.
     */
    info(message: string, context?: any): void;

    /**
     * Logs a warning message.
     */
    warn(message: string, context?: any): void;

    /**
     * Logs an error message.
     */
    error(message: string, context?: any): void;

    /**
     * Logs a debug message (typically visible only in development).
     */
    debug(message: string, context?: any): void;
}
