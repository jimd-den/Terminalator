import { IVimMode } from '../IVimMode';
import { IVimState } from '../../../entities/vim/IVimState';
import { IVimBuffer } from '../../../entities/vim/IVimBuffer';
import { VimCommandManager } from '../VimCommandManager';
import { MotionStrategy } from '../MotionStrategy';

/**
 * NormalMode - Domain Layer Use Case (State Strategy)
 * 
 * Implementation of Vim's default navigation and command mode.
 * 
 * Pillar: THE Swift Stream (Pure logic)
 */
export class NormalMode implements IVimMode {
    readonly name = 'NORMAL';

    handleKey(
        key: string,
        state: IVimState,
        buffer: IVimBuffer,
        commands: VimCommandManager
    ): string | null {
        // Handle pending actions (e.g., 'd' was pressed)
        if (state.pendingAction === 'DELETE') {
            return this.handleDeleteAction(key, state, buffer, commands);
        }

        // Handle 'g' prefix for 'gg'
        if (state.pendingAction === 'G_PREFIX') {
            if (key === 'g') {
                state.cursor.line = 0;
                state.cursor.col = 0;
            }
            state.pendingAction = null;
            return null;
        }

        switch (key) {
            case 'h': this.moveCursor(state, 0, -1); break;
            case 'j': this.moveCursor(state, 1, 0); break;
            case 'k': this.moveCursor(state, -1, 0); break;
            case 'l': this.moveCursor(state, 0, 1); break;
            
            case 'w':
                const nextPos = MotionStrategy.findNextWordStart(buffer, state.cursor.line, state.cursor.col);
                state.cursor.line = nextPos.line;
                state.cursor.col = nextPos.col;
                break;

            case '$':
                const eolPos = MotionStrategy.findEndOfLine(buffer, state.cursor.line);
                state.cursor.col = eolPos.col;
                break;

            case '0':
            case '^':
                state.cursor.col = 0;
                break;

            case 'G':
                state.cursor.line = Math.max(0, buffer.length - 1);
                state.cursor.col = 0;
                break;

            case 'g':
                state.pendingAction = 'G_PREFIX';
                break;

            case 'd':
                state.pendingAction = 'DELETE';
                break;

            case 'D':
                const eol = MotionStrategy.findEndOfLine(buffer, state.cursor.line);
                commands.deleteRange(state.cursor.line, state.cursor.col, eol.col);
                break;

            case 'i': 
                return 'INSERT';
            
            case 'a':
                this.moveCursor(state, 0, 1);
                return 'INSERT';
            
            case ':':
                return 'COMMAND';
            
            case 'x':
                commands.deleteChar(state.cursor.line, state.cursor.col);
                break;
            
            case 'u':
                commands.undo();
                break;
            
            case 'CTRL_R':
                commands.redo();
                break;
        }

        return null; // Stay in Normal
    }

    private handleDeleteAction(key: string, state: IVimState, buffer: IVimBuffer, commands: VimCommandManager): string | null {
        state.pendingAction = null; 

        switch (key) {
            case 'w':
                const nextPos = MotionStrategy.findNextWordStart(buffer, state.cursor.line, state.cursor.col);
                // 'dw' deletes from cursor to before next word start
                if (nextPos.col > state.cursor.col) {
                    commands.deleteRange(state.cursor.line, state.cursor.col, nextPos.col - 1);
                } else {
                    // If we are at the end of line, 'dw' might delete current char or nothing
                    commands.deleteChar(state.cursor.line, state.cursor.col);
                }
                break;
            case '$':
                const eolPos = MotionStrategy.findEndOfLine(buffer, state.cursor.line);
                commands.deleteRange(state.cursor.line, state.cursor.col, eolPos.col);
                break;
            case 'd': // 'dd'
                const fullLine = MotionStrategy.findEndOfLine(buffer, state.cursor.line);
                commands.deleteRange(state.cursor.line, 0, fullLine.col);
                break;
            case 'ESC':
                break;
        }
        return null;
    }

    private moveCursor(state: IVimState, dLine: number, dCol: number): void {
        state.cursor.line += dLine;
        state.cursor.col += dCol;
    }
}
