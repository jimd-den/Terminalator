import { IVimCommand } from '../IVimCommand';
import { IVimBuffer } from '../IVimBuffer';

/**
 * DeleteRangeCommand - Domain Layer Entity
 * 
 * Logic for deleting a range of text within a single line.
 * 
 * Pillar: THE Swift Stream (Performance & Purity)
 */
export class DeleteRangeCommand implements IVimCommand {
    private deletedText: string = '';

    constructor(
        private buffer: IVimBuffer,
        private line: number,
        private startCol: number,
        private endCol: number
    ) {}

    execute(): void {
        const lineContent = this.buffer.getLine(this.line);
        // endCol is inclusive
        this.deletedText = lineContent.slice(this.startCol, this.endCol + 1);
        const newContent = lineContent.slice(0, this.startCol) + lineContent.slice(this.endCol + 1);
        this.buffer.updateLine(this.line, newContent);
    }

    undo(): void {
        const lineContent = this.buffer.getLine(this.line);
        const newContent = lineContent.slice(0, this.startCol) + this.deletedText + lineContent.slice(this.startCol);
        this.buffer.updateLine(this.line, newContent);
    }
}
