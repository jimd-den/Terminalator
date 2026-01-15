/**
 * Interpreter Interface - Domain Layer
 * 
 * Defines the contract for all language interpreters in the system.
 * Allows for easy addition of new languages in the future.
 */

export interface Interpreter {
    evaluate(code: string, context?: any): string;
}
