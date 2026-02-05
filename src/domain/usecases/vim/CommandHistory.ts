import { IVimCommand } from '../../entities/vim/IVimCommand';

/**
 * CommandHistory - Domain Layer Use Case
 * 
 * Manages the stack of executed commands to facilitate Undo and Redo operations.
 * 
 * Pillar: THE BALANCED SCALE (SOLID / KISS) - SRP
 * 
 * Intent:
 * Maintains the temporal sequence of operations. It ensures that the state 
 * can be rewound (Undo) or fast-forwarded (Redo) without the commands
 * themselves needing to know about each other.
 */
export class CommandHistory {
    private undoStack: IVimCommand[] = [];
    private redoStack: IVimCommand[] = [];

    /**
     * Pushes a newly executed command onto the undo stack and clears redo history.
     */
    public push(command: IVimCommand): void {
        this.undoStack.push(command);
        this.redoStack = []; // New actions break the redo chain
    }

    /**
     * Undoes the last command if possible.
     */
    public undo(): void {
        const command = this.undoStack.pop();
        if (command) {
            command.undo();
            this.redoStack.push(command);
        }
    }

    /**
     * Redoes the last undone command if possible.
     */
    public redo(): void {
        const command = this.redoStack.pop();
        if (command) {
            command.execute();
            this.undoStack.push(command);
        }
    }

    public clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }
}
