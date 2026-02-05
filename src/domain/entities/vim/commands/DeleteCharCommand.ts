import { IVimCommand } from '../IVimCommand';
import { IVimBuffer } from '../IVimBuffer';

/**
 * DeleteCharCommand - Domain Layer Entity
 * 
 * Logic for removing a single character from the buffer.
 * 
 * Intent:
 * Captures the character being deleted to ensure perfect restoration during Undo.
 */
export class DeleteCharCommand implements IVimCommand {
    private deletedChar: string = '';

    constructor(
        private buffer: IVimBuffer,
        private line: number,
        private col: number
    ) {}

    execute(): void {
        const lineContent = this.buffer.getLine(this.line);
        this.deletedChar = lineContent[this.col] || '';
        const newContent = lineContent.slice(0, this.col) + lineContent.slice(this.col + 1);
        this.buffer.updateLine(this.line, newContent);
    }

    undo(): void {
        const lineContent = this.buffer.getLine(this.line);
        const newContent = lineContent.slice(0, this.col) + this.deletedChar + lineContent.slice(this.col);
        this.buffer.updateLine(this.line, newContent);
    }
}
