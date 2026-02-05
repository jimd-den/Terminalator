import { IVimBuffer } from '../../entities/vim/IVimBuffer';
import { IVimCommand } from '../../entities/vim/IVimCommand';
import { CommandHistory } from './CommandHistory';
import { InsertCharCommand } from '../../entities/vim/commands/InsertCharCommand';
import { DeleteCharCommand } from '../../entities/vim/commands/DeleteCharCommand';
import { DeleteRangeCommand } from '../../entities/vim/commands/DeleteRangeCommand';

/**
 * VimCommandManager - Domain Layer Use Case
 * 
 * High-level API for executing commands on a buffer while maintaining history.
 * 
 * Pillar: THE FOUR-FOLD SHIELD (Strict Architecture)
 * Pillar: THE MASTER’S TOOL (Command Pattern)
 * 
 * Intent:
 * Acts as the 'Invoker' in the Command Pattern. It provides semantic methods
 * for common editor actions, ensuring they are correctly wrapped in Command
 * objects and pushed to the history.
 */
export class VimCommandManager {
    private history: CommandHistory = new CommandHistory();

    constructor(private buffer: IVimBuffer) {}

    public insertChar(char: string, line: number, col: number): void {
        const cmd = new InsertCharCommand(this.buffer, char, line, col);
        this.execute(cmd);
    }

    public deleteChar(line: number, col: number): void {
        const cmd = new DeleteCharCommand(this.buffer, line, col);
        this.execute(cmd);
    }

    public deleteRange(line: number, startCol: number, endCol: number): void {
        const cmd = new DeleteRangeCommand(this.buffer, line, startCol, endCol);
        this.execute(cmd);
    }

    public undo(): void {
        this.history.undo();
    }

    public redo(): void {
        this.history.redo();
    }

    /**
     * Internal helper to execute and record a command.
     */
    private execute(command: IVimCommand): void {
        command.execute();
        this.history.push(command);
    }

    public clearHistory(): void {
        this.history.clear();
    }
}
