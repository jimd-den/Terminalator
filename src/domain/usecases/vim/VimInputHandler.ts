import { IVimState } from '../../entities/vim/IVimState';
import { IVimBuffer } from '../../entities/vim/IVimBuffer';
import { VimStateEntity } from '../../entities/vim/VimStateEntity';

export class VimInputHandler {
    public handleKey(key: string, state: IVimState, buffer: IVimBuffer): IVimState {
        // We expect state to be a VimStateEntity or at least have a clone method
        const nextState = (state as VimStateEntity).clone 
            ? (state as VimStateEntity).clone() 
            : new VimStateEntity(state.mode, { ...state.cursor }, state.pendingAction, state.statusMessage, [...state.lintErrors]);

        if (key === 'ESC') {
            nextState.mode = 'NORMAL';
            nextState.pendingAction = null;
            nextState.statusMessage = '';
            this.clampCursor(nextState, buffer);
            return nextState;
        }

        switch (nextState.mode) {
            case 'NORMAL':
                this.handleNormalMode(key, nextState, buffer);
                break;
            case 'INSERT':
                this.handleInsertMode(key, nextState, buffer);
                break;
            case 'COMMAND':
                this.handleCommandMode(key, nextState, buffer);
                break;
        }

        this.clampCursor(nextState, buffer);
        return nextState;
    }

    private handleNormalMode(key: string, state: IVimState, buffer: IVimBuffer): void {
        switch (key) {
            case 'h': this.moveCursor(state, 0, -1); break;
            case 'j': this.moveCursor(state, 1, 0); break;
            case 'k': this.moveCursor(state, -1, 0); break;
            case 'l': this.moveCursor(state, 0, 1); break;
            case 'i': state.mode = 'INSERT'; state.statusMessage = '-- INSERT --'; break;
            case 'a':
                this.moveCursor(state, 0, 1);
                state.mode = 'INSERT';
                state.statusMessage = '-- INSERT --';
                break;
            case ':': state.mode = 'COMMAND'; state.statusMessage = ':'; break;
            case 'x':
                this.deleteCharAtCursor(state, buffer);
                break;
        }
    }

    private handleInsertMode(key: string, state: IVimState, buffer: IVimBuffer): void {
        if (key === 'BACKSPACE') {
            this.handleBackspace(state, buffer);
        } else if (key === 'ENTER' || key === '\\n') {
            buffer.splitLine(state.cursor.line, state.cursor.col);
            state.cursor.line++;
            state.cursor.col = 0;
        } else if (key.length === 1) {
            const line = buffer.getLine(state.cursor.line);
            const newLine = line.slice(0, state.cursor.col) + key + line.slice(state.cursor.col);
            buffer.updateLine(state.cursor.line, newLine);
            state.cursor.col++;
        }
    }

    private handleCommandMode(key: string, state: IVimState, buffer: IVimBuffer): void {
        if (key === 'ENTER' || key === '\\n') {
            state.mode = 'NORMAL';
            state.statusMessage = '';
        } else {
            state.statusMessage += key;
        }
    }

    private handleBackspace(state: IVimState, buffer: IVimBuffer): void {
        if (state.cursor.col > 0) {
            const line = buffer.getLine(state.cursor.line);
            const newLine = line.slice(0, state.cursor.col - 1) + line.slice(state.cursor.col);
            buffer.updateLine(state.cursor.line, newLine);
            state.cursor.col--;
        } else if (state.cursor.line > 0) {
            const prevLineIdx = state.cursor.line - 1;
            const prevLineLen = buffer.getLine(prevLineIdx).length;
            buffer.joinLines(prevLineIdx);
            state.cursor.line = prevLineIdx;
            state.cursor.col = prevLineLen;
        }
    }

    private deleteCharAtCursor(state: IVimState, buffer: IVimBuffer): void {
        const line = buffer.getLine(state.cursor.line);
        if (line.length > 0) {
            const newLine = line.slice(0, state.cursor.col) + line.slice(state.cursor.col + 1);
            buffer.updateLine(state.cursor.line, newLine);
        }
    }

    private moveCursor(state: IVimState, dLine: number, dCol: number): void {
        state.cursor.line += dLine;
        state.cursor.col += dCol;
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