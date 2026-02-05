import { IVimCommand } from '../IVimCommand';
import { IVimBuffer } from '../IVimBuffer';

/**
 * InsertCharCommand - Domain Layer Entity
 * 
 * Logic for inserting a single character into the buffer.
 * 
 * Pillar: THE Swift Stream (Performance & Purity)
 */
export class InsertCharCommand implements IVimCommand {
    constructor(
        private buffer: IVimBuffer,
        private char: string,
        private line: number,
        private col: number
    ) {}

    execute(): void {
        const lineContent = this.buffer.getLine(this.line);
        const newContent = lineContent.slice(0, this.col) + this.char + lineContent.slice(this.col);
        this.buffer.updateLine(this.line, newContent);
    }

    undo(): void {
        const lineContent = this.buffer.getLine(this.line);
        const newContent = lineContent.slice(0, this.col) + lineContent.slice(this.col + 1);
        this.buffer.updateLine(this.line, newContent);
    }
}
