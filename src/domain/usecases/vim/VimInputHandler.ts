import { IVimState } from '../../entities/vim/IVimState';
import { IVimBuffer } from '../../entities/vim/IVimBuffer';
import { VimStateEntity } from '../../entities/vim/VimStateEntity';
import { IVimMode } from './IVimMode';
import { NormalMode } from './modes/NormalMode';
import { InsertMode } from './modes/InsertMode';
import { CommandMode } from './modes/CommandMode';
import { VimCommandManager } from './VimCommandManager';

/**
 * VimInputHandler - Domain Layer Use Case (State Pattern Context)
 * 
 * Orchestrates the delegation of key inputs to the active mode strategy.
 * 
 * Pillar: THE MASTER’S TOOL (State Pattern)
 */
export class VimInputHandler {
    private modes: Map<string, IVimMode> = new Map();

    constructor() {
        this.modes.set('NORMAL', new NormalMode());
        this.modes.set('INSERT', new InsertMode());
        this.modes.set('COMMAND', new CommandMode());
    }

    public handleKey(key: string, state: IVimState, buffer: IVimBuffer, commands: VimCommandManager): IVimState {
        // 1. Create a working copy of the state (Immutability where possible)
        const nextState = (state as VimStateEntity).clone 
            ? (state as VimStateEntity).clone() 
            : new VimStateEntity(state.mode, { ...state.cursor }, state.pendingAction, state.statusMessage, [...state.lintErrors], state.isLocked || false);

        // 2. Guards
        if (nextState.isLocked) return nextState;
        if (['SHIFT', 'CONTROL', 'ALT', 'META'].includes(key.toUpperCase())) return nextState;

        // 3. Global Keys (like ESC)
        if (key === 'ESC') {
            nextState.mode = 'NORMAL';
            nextState.pendingAction = null;
            nextState.statusMessage = '';
            this.clampCursor(nextState, buffer);
            return nextState;
        }

        // 4. Delegate to Strategy (State Pattern)
        const modeStrategy = this.modes.get(nextState.mode);
        if (modeStrategy) {
            const result = modeStrategy.handleKey(key, nextState, buffer, commands);
            
            // Handle Mode Transition
            if (result && result !== nextState.mode) {
                nextState.mode = result as any;
                this.updateStatusForMode(nextState);
            }
        }

        // 5. Post-process (Invariant enforcement)
        this.clampCursor(nextState, buffer);
        
        return nextState;
    }

    private updateStatusForMode(state: IVimState): void {
        switch (state.mode) {
            case 'NORMAL':
                state.statusMessage = '';
                break;
            case 'INSERT':
                state.statusMessage = '-- INSERT --';
                break;
            case 'COMMAND':
                state.statusMessage = ':';
                break;
        }
    }

    private clampCursor(state: IVimState, buffer: IVimBuffer): void {
        const lineCount = buffer.length;
        if (state.cursor.line < 0) state.cursor.line = 0;
        if (state.cursor.line >= lineCount) state.cursor.line = lineCount - 1;

        const line = buffer.getLine(state.cursor.line);
        const lineLen = line.length;
        const maxCol = state.mode === 'INSERT' ? lineLen : Math.max(0, lineLen - 1);

        if (state.cursor.col < 0) state.cursor.col = 0;
        if (state.cursor.col > maxCol) state.cursor.col = maxCol;
    }
}
