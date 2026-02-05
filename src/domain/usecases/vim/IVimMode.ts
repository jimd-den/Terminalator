import { IVimState } from '../../entities/vim/IVimState';
import { IVimBuffer } from '../../entities/vim/IVimBuffer';
import { VimCommandManager } from './VimCommandManager';

/**
 * IVimMode - Domain Layer Use Case (State Pattern)
 * 
 * Defines the behavioral contract for a specific Vim mode (Normal, Insert, etc.).
 * 
 * Pillar: THE MASTER’S TOOL (State Pattern)
 * 
 * Intent:
 * By encapsulating mode-specific logic in separate classes, we can add new modes
 * or change behavior without modifying the main engine (OCP).
 * This acts as the 'State' in the State Pattern.
 */
export interface IVimMode {
    /**
     * Unique identifier for the mode.
     */
    readonly name: string;

    /**
     * Processes a key input within the context of this mode.
     * Returns the next mode if a transition occurs, or null to stay in current mode.
     */
    handleKey(
        key: string, 
        state: IVimState, 
        buffer: IVimBuffer, 
        commands: VimCommandManager
    ): string | null;
}
