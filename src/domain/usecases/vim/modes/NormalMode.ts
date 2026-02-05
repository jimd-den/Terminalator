import { IVimMode } from '../IVimMode';
import { IVimState } from '../../../entities/vim/IVimState';
import { IVimBuffer } from '../../../entities/vim/IVimBuffer';
import { VimCommandManager } from '../VimCommandManager';

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
        switch (key) {
            case 'h': this.moveCursor(state, 0, -1); break;
            case 'j': this.moveCursor(state, 1, 0); break;
            case 'k': this.moveCursor(state, -1, 0); break;
            case 'l': this.moveCursor(state, 0, 1); break;
            
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
            
            case 'CTRL_R': // Simplified for now
                commands.redo();
                break;
        }

        return null; // Stay in Normal
    }

    private moveCursor(state: IVimState, dLine: number, dCol: number): void {
        state.cursor.line += dLine;
        state.cursor.col += dCol;
    }
}
