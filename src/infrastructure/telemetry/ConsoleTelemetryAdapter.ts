/**
 * ConsoleTelemetryAdapter - Infrastructure Layer
 * 
 * An implementation of the TelemetryPort that outputs to the console.
 * Adheres to "The Watchman’s Log" by providing ISO 8601 timestamps and detailed context.
 *
 * Pillar: The Watchman’s Log (Telemetry)
 * Pillar: The Four-Fold Shield (Strict Architecture) - Interface Adapter
 */

import { TelemetryPort } from '../../domain/ports/TelemetryPort';

enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG',
}

export class ConsoleTelemetryAdapter implements TelemetryPort {
    private formatMessage(level: LogLevel, message: string, context?: any): string {
        const timestamp = new Date().toISOString();
        const contextString = context ? ` | Context: ${JSON.stringify(context)}` : '';
        return `[${timestamp}] [${level}] ${message}${contextString}`;
    }

    info(message: string, context?: any): void {
        console.log(this.formatMessage(LogLevel.INFO, message, context));
    }

    warn(message: string, context?: any): void {
        console.warn(this.formatMessage(LogLevel.WARN, message, context));
    }

    error(message: string, context?: any): void {
        console.error(this.formatMessage(LogLevel.ERROR, message, context));
    }

    debug(message: string, context?: any): void {
        if (__DEV__) {
            console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
        }
    }

    trace<T>(fnName: string, fn: (...args: any[]) => T, ...args: any[]): T {
        this.debug(`Executing ${fnName}`, { arguments: args });
        try {
            const result = fn(...args);

            if (result instanceof Promise) {
                return result.then(res => {
                    this.debug(`Completed ${fnName}`, { result: res });
                    return res;
                }).catch(err => {
                    this.error(`Failed ${fnName}`, { error: err, arguments: args });
                    throw err;
                }) as any;
            }

            this.debug(`Completed ${fnName}`, { result });
            return result;
        } catch (error) {
            this.error(`Failed ${fnName}`, { error, arguments: args });
            throw error;
        }
    }
}
