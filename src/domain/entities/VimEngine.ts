/**
 * VimEngine - Domain Layer Entity (Context for State Pattern)
 *
 * Manages the state and transitions of a Vim editing session by delegating to
 * VimStateEntity and the IVimMode strategies.
 *
 * Pillar: The Master’s Tool (State Pattern)
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Provides a stable interface for Vim operations while ensuring logic is decoupled.
 * Acts as the 'Context' in the State Pattern.
 */

import { EditorBuffer } from './EditorBuffer';
import { IVimState, VimMode, VimCursor, SyntaxError } from './vim/IVimState';
import { VimStateEntity } from './vim/VimStateEntity';
import { VimInputHandler } from '../usecases/vim/VimInputHandler';
import { VimCommandManager } from '../usecases/vim/VimCommandManager';

export { VimMode, VimCursor, SyntaxError, IVimState as VimState };

export class VimEngine {
    private buffer: EditorBuffer;
    private state: VimStateEntity;
    private handler: VimInputHandler;
    private commands: VimCommandManager;

    constructor(buffer: EditorBuffer) {
        this.buffer = buffer;
        this.state = new VimStateEntity();
        this.handler = new VimInputHandler();
        this.commands = new VimCommandManager(buffer);
    }

    /**
     * Returns a clone of the current state.
     */
    getState(): IVimState {
        return this.state.clone();
    }

    /**
     * Processes raw key input by delegating to the VimInputHandler use case.
     */
    handleInput(input: string): void {
        this.state = this.handler.handleKey(input, this.state, this.buffer, this.commands) as VimStateEntity;
    }

    /**
     * Explicitly sets the editing mode.
     */
    setMode(mode: VimMode): void {
        this.state.mode = mode;
        this.state.statusMessage = mode === 'NORMAL' ? '' : `-- ${mode} --`;
    }

    /**
     * Updates the status message displayed at the bottom of the editor.
     */
    setStatusMessage(msg: string): void {
        this.state.statusMessage = msg;
    }

    /**
     * Updates the lint/syntax errors for the current buffer.
     */
    setLintErrors(errors: SyntaxError[]): void {
        this.state.lintErrors = errors;
    }

    /**
     * Accessor for Undo/Redo stack.
     */
    undo(): void {
        this.commands.undo();
        // After undo, we might need to clamp cursor if it was left in a weird place
    }

    redo(): void {
        this.commands.redo();
    }
}