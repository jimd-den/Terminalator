/**
 * VimEngine - Domain Layer Entity
 *
 * Manages the state and transitions of a Vim editing session.
 *
 * Pillar: The Master’s Tool (Pragmatic Design Patterns) - State Pattern
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Decouples Vim mechanics from UI and Infrastructure.
 * Translates raw key inputs into buffer operations and state changes.
 */

import { EditorBuffer } from './EditorBuffer';

export type VimMode = 'NORMAL' | 'INSERT' | 'COMMAND';

export interface VimCursor {
    line: number;
    col: number;
}

export interface VimState {
    mode: VimMode;
    cursor: VimCursor;
    pendingAction: string | null;
    statusMessage: string;
}

export class VimEngine {
    private buffer: EditorBuffer;
    private state: VimState;

    constructor(buffer: EditorBuffer) {
        this.buffer = buffer;
        this.state = {
            mode: 'NORMAL',
            cursor: { line: 0, col: 0 },
            pendingAction: null,
            statusMessage: ''
        };
    }

    getState(): VimState {
        return { ...this.state };
    }

    /**
     * The primary entry point for all key inputs.
     * 
     * @param input - The character or special key (e.g., 'ESC', 'BACKSPACE')
     */
    handleInput(input: string): void {
        if (input === 'ESC') {
            this.setMode('NORMAL');
            this.state.pendingAction = null;
            return;
        }

        switch (this.state.mode) {
            case 'NORMAL':
                this.handleNormalMode(input);
                break;
            case 'INSERT':
                this.handleInsertMode(input);
                break;
            case 'COMMAND':
                this.handleCommandMode(input);
                break;
        }
    }

    private handleNormalMode(key: string): void {
        if (this.state.pendingAction === 'd') {
            if (key === 'd') {
                this.buffer.deleteLine(this.state.cursor.line);
                this.clampCursor();
                this.state.pendingAction = null;
                return;
            }
            this.state.pendingAction = null; // Reset if not 'd'
        }

        switch (key) {
            case 'h': this.moveCursor(0, -1); break;
            case 'j': this.moveCursor(1, 0); break;
            case 'k': this.moveCursor(-1, 0); break;
            case 'l': this.moveCursor(0, 1); break;
            case 'i': this.setMode('INSERT'); break;
            case 'a':
                this.moveCursor(0, 1);
                this.setMode('INSERT');
                break;
            case ':': this.setMode('COMMAND'); break;
            case 'x':
                this.deleteCharAtCursor();
                break;
            case 'd':
                this.state.pendingAction = 'd';
                break;
            case 'u':
                // TODO: Undo
                this.state.statusMessage = 'Undo not implemented yet';
                break;
        }
    }

    private handleInsertMode(key: string): void {
        if (key === 'BACKSPACE') {
            this.handleBackspace();
        } else if (key === 'TAB') {
            const line = this.buffer.getLine(this.state.cursor.line);
            const spaces = '    ';
            const newLine = line.slice(0, this.state.cursor.col) + spaces + line.slice(this.state.cursor.col);
            this.buffer.updateLine(this.state.cursor.line, newLine);
            this.moveCursor(0, 4);
        } else if (key === 'ENTER' || key === '\n') {
            this.buffer.splitLine(this.state.cursor.line, this.state.cursor.col);
            this.moveCursor(1, 0);
            this.state.cursor.col = 0;
        } else {
            // Standard char insert
            const line = this.buffer.getLine(this.state.cursor.line);
            const newLine = line.slice(0, this.state.cursor.col) + key + line.slice(this.state.cursor.col);
            this.buffer.updateLine(this.state.cursor.line, newLine);
            this.moveCursor(0, 1);
        }
    }

    private handleCommandMode(key: string): void {
        // Command mode logic is typically handled by the controller (VimSimulator)
        // for saves/exits, but we could buffer the command string here.
    }

    private handleBackspace(): void {
        const { line: lineIdx, col } = this.state.cursor;
        const line = this.buffer.getLine(lineIdx);

        if (col > 0) {
            const newLine = line.slice(0, col - 1) + line.slice(col);
            this.buffer.updateLine(lineIdx, newLine);
            this.moveCursor(0, -1);
        } else if (lineIdx > 0) {
            const prevLineIdx = lineIdx - 1;
            const prevLine = this.buffer.getLine(prevLineIdx);
            const prevLen = prevLine.length;
            this.buffer.joinLines(prevLineIdx);
            this.state.cursor = { line: prevLineIdx, col: prevLen };
        }
    }

    private deleteCharAtCursor(): void {
        const { line: lineIdx, col } = this.state.cursor;
        const line = this.buffer.getLine(lineIdx);
        if (line.length > 0) {
            const newLine = line.slice(0, col) + line.slice(col + 1);
            this.buffer.updateLine(lineIdx, newLine);
            this.clampCursor();
        }
    }

    private moveCursor(dLine: number, dCol: number): void {
        this.state.cursor.line += dLine;
        this.state.cursor.col += dCol;
        this.clampCursor();
    }

    private clampCursor(): void {
        const s = this.state;
        const lineCount = this.buffer.length;

        if (s.cursor.line < 0) s.cursor.line = 0;
        if (s.cursor.line >= lineCount) s.cursor.line = lineCount - 1;

        const line = this.buffer.getLine(s.cursor.line);
        const lineLen = line.length;

        // In NORMAL mode, cursor cannot be beyond last char (unless empty)
        // In INSERT mode, cursor can be at the index after last char
        const maxCol = s.mode === 'INSERT' ? lineLen : Math.max(0, lineLen - 1);

        if (s.cursor.col < 0) s.cursor.col = 0;
        if (s.cursor.col > maxCol) s.cursor.col = maxCol;
    }

    setMode(mode: VimMode): void {
        this.state.mode = mode;
        this.state.statusMessage = mode === 'NORMAL' ? '' : `-- ${mode} --`;
        this.clampCursor();
    }

    setStatusMessage(msg: string): void {
        this.state.statusMessage = msg;
    }
}
