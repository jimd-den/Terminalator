import { IVimMode } from '../IVimMode';
import { IVimState } from '../../../entities/vim/IVimState';
import { IVimBuffer } from '../../../entities/vim/IVimBuffer';
import { VimCommandManager } from '../VimCommandManager';

/**
 * CommandMode - Domain Layer Use Case (State Strategy)
 * 
 * Implementation of Vim's command-line mode (:).
 * 
 * Pillar: THE Swift Stream (Pure logic)
 */
export class CommandMode implements IVimMode {
    readonly name = 'COMMAND';

    handleKey(
        key: string,
        state: IVimState,
        buffer: IVimBuffer,
        commands: VimCommandManager
    ): string | null {
        if (key === 'ESC') {
            state.statusMessage = '';
            return 'NORMAL';
        }

        if (key === 'ENTER' || key === '\n' || key === '\r') {
            // Command execution logic is currently handled by Interface Adapters (VimSimulator).
            // This transition triggers the return to Normal Mode.
            return 'NORMAL';
        }

        if (key === 'BACKSPACE') {
            if (state.statusMessage.length > 1) {
                state.statusMessage = state.statusMessage.slice(0, -1);
            } else {
                state.statusMessage = '';
                return 'NORMAL';
            }
        } else if (key.length === 1) {
            state.statusMessage += key;
        }

        return null;
    }
}