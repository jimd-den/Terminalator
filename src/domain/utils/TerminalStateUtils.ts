import { TerminalState } from '../entities/TerminalState';

/**
 * TerminalStateUtils - Pure Functional Utilities
 * 
 * Adheres to:
 * - KISS: Simple, focused functions.
 * - Pure Functions: No side effects, deterministic output.
 * - DRY: Centralized state merging logic.
 */

/**
 * Merges partial updates into the current terminal state.
 * Returns a NEW state object (Immutability).
 * 
 * @param currentState - The original state.
 * @param updates - Partial state updates.
 * @returns A new TerminalState instance.
 */
export function mergeState(currentState: TerminalState, updates?: Partial<TerminalState>): TerminalState {
    if (!updates) {
        return currentState;
    }
    return { ...currentState, ...updates };
}

/**
 * Updates the last exit code of the state.
 * 
 * @param state - The current state.
 * @param code - The new exit code.
 * @returns A new TerminalState with updated exit code.
 */
export function updateExitCode(state: TerminalState, code: number): TerminalState {
    return { ...state, lastExitCode: code };
}

/**
 * Creates a generic success response state.
 * 
 * @param state - Current state.
 * @param output - Usage output.
 * @returns Object compatible with CommandResponse structure.
 */
export function success(state: TerminalState, output: string = '') {
    return {
        output,
        newState: updateExitCode(state, 0),
        exitCode: 0
    };
}

/**
 * Creates a generic error response state.
 * 
 * @param state - Current state.
 * @param error - Error message.
 * @param code - Exit code (default 1).
 * @returns Object compatible with CommandResponse structure.
 */
export function fail(state: TerminalState, error: string, code: number = 1) {
    return {
        output: error,
        newState: updateExitCode(state, code),
        exitCode: code
    };
}
