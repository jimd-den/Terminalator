/**
 * IVimCommand - Domain Layer Entity
 * 
 * Defines the contract for all atomic operations that modify the state of the editor.
 * This is the core of the Command Pattern implementation.
 * 
 * Pillar: THE MASTER’S TOOL (Command Pattern)
 * 
 * Intent:
 * By treating actions as objects, we can decouple the request for an operation
 * from the implementation of that operation. This allows for:
 * 1. Undo/Redo capability (The Chronos Strategy).
 * 2. Macro recording and playback.
 * 3. Atomic execution of complex composite actions.
 */
export interface IVimCommand {
    /**
     * Executes the command, modifying the buffer or state.
     * Must be deterministic and side-effect-free relative to external systems.
     */
    execute(): void;

    /**
     * Reverses the changes made by execute().
     * Restores the buffer and state to exactly what they were before execution.
     */
    undo(): void;
}
