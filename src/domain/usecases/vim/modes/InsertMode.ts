import { IVimMode } from '../IVimMode';
import { IVimState } from '../../../entities/vim/IVimState';
import { IVimBuffer } from '../../../entities/vim/IVimBuffer';
import { VimCommandManager } from '../VimCommandManager';

/**
 * InsertMode - Domain Layer Use Case (State Strategy)
 * 
 * Implementation of Vim's text insertion mode.
 * 
 * Pillar: THE Swift Stream (Pure logic)
 */
export class InsertMode implements IVimMode {
    readonly name = 'INSERT';

    handleKey(
        key: string,
        state: IVimState,
        buffer: IVimBuffer,
        commands: VimCommandManager
    ): string | null {
        if (key === 'ESC') {
            return 'NORMAL';
        }

        if (key === 'BACKSPACE') {
            this.handleBackspace(state, buffer, commands);
        } else if (key === 'ENTER' || key === '\n' || key === '\r') {
            this.handleEnter(state, buffer, commands);
        } else if (key.length === 1) {
            commands.insertChar(key, state.cursor.line, state.cursor.col);
            state.cursor.col++;
        }

        return null;
    }

    private handleBackspace(state: IVimState, buffer: IVimBuffer, commands: VimCommandManager): void {
        if (state.cursor.col > 0) {
            // Use Command for undoability
            commands.deleteChar(state.cursor.line, state.cursor.col - 1);
            state.cursor.col--;
        } else if (state.cursor.line > 0) {
            // Fallback to direct buffer manipulation for now (undo will be imperfect for line joins)
            const prevLineIdx = state.cursor.line - 1;
            const prevLineLen = buffer.getLine(prevLineIdx).length;
            buffer.joinLines(prevLineIdx);
            state.cursor.line = prevLineIdx;
            state.cursor.col = prevLineLen;
        }
    }

    private handleEnter(state: IVimState, buffer: IVimBuffer, commands: VimCommandManager): void {
        // Fallback to direct buffer manipulation for now (undo will be imperfect for line splits)
        buffer.splitLine(state.cursor.line, state.cursor.col);
        state.cursor.line++;
        state.cursor.col = 0;
    }
}