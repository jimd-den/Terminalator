/**
 * Logger Service - Frameworks/Drivers Layer
 * 
 * Provides granular logging with ISO 8601 timestamps and traceability.
 * Adheres to the Observability & Telemetry requirement.
 */

export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG',
}

export class Logger {
    private static formatMessage(level: LogLevel, message: string, context?: any): string {
        const timestamp = new Date().toISOString();
        const contextString = context ? ` | Context: ${JSON.stringify(context)}` : '';
        return `[${timestamp}] [${level}] ${message}${contextString}`;
    }

    static info(message: string, context?: any): void {
        console.log(this.formatMessage(LogLevel.INFO, message, context));
    }

    static warn(message: string, context?: any): void {
        console.warn(this.formatMessage(LogLevel.WARN, message, context));
    }

    static error(message: string, context?: any): void {
        console.error(this.formatMessage(LogLevel.ERROR, message, context));
    }

    static debug(message: string, context?: any): void {
        if (__DEV__) {
            console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
        }
    }

    /**
     * Trace decorator/wrapper to log function execution, inputs, and outputs.
     */
    static trace<T>(fnName: string, fn: (...args: any[]) => T, ...args: any[]): T {
        this.debug(`Executing ${fnName}`, { arguments: args });
        try {
            const result = fn(...args);
            this.debug(`Completed ${fnName}`, { result });
            return result;
        } catch (error) {
            this.error(`Failed ${fnName}`, { error, arguments: args });
            throw error;
        }
    }
}
