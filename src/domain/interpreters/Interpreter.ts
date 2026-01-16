/**
 * Interpreter Interface - Domain Layer
 * 
 * Defines the contract for all language interpreters in the system.
 * Allows for easy addition of new languages in the future.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Master’s Tool (Pragmatic Design Patterns) - Strategy Pattern
 */

export interface Interpreter {
    /**
     * Evaluates source code within a given context.
     *
     * @param code - The source code to evaluate.
     * @param context - Optional execution context (variables, etc.).
     * @returns The string result of the evaluation.
     */
    evaluate(code: string, context?: any): string;
}
