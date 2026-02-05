/**
 * VimEngine - Domain Layer Entity (Interface Adapter/Controller Wrapper)
 *
 * Manages the state and transitions of a Vim editing session by delegating to
 * VimStateEntity and VimInputHandler Use Case.
 *
 * Pillar: The Master’s Tool (Pragmatic Design Patterns) - Strategy/State
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Provides a stable interface for Vim operations while ensuring logic is decoupled.
 */

import { EditorBuffer } from './EditorBuffer';
import { IVimState, VimMode, VimCursor, SyntaxError } from './vim/IVimState';
import { VimStateEntity } from './vim/VimStateEntity';
import { VimInputHandler } from '../usecases/vim/VimInputHandler';

export { VimMode, VimCursor, SyntaxError, IVimState as VimState };

export class VimEngine {
    private buffer: EditorBuffer;
    private state: VimStateEntity;
    private handler: VimInputHandler;

    constructor(buffer: EditorBuffer) {
        this.buffer = buffer;
        this.state = new VimStateEntity();
        this.handler = new VimInputHandler();
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
        this.state = this.handler.handleKey(input, this.state, this.buffer) as VimStateEntity;
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
}