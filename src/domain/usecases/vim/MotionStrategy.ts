import { IVimBuffer } from '../../entities/vim/IVimBuffer';

/**
 * MotionStrategy - Domain Layer Use Case (Strategy Pattern)
 * 
 * Pure functions for calculating cursor movements.
 * 
 * Pillar: THE Swift Stream (Purity & Performance)
 */
export class MotionStrategy {
    /**
     * Finds the start of the next word (vaguely following 'w').
     */
    public static findNextWordStart(buffer: IVimBuffer, lineIdx: number, colIdx: number): { line: number, col: number } {
        const line = buffer.getLine(lineIdx);
        let current = colIdx;

        // 1. Move past the current word (non-whitespace)
        while (current < line.length && !this.isWhitespace(line[current])) {
            current++;
        }

        // 2. Move past any whitespace to the start of the next word
        while (current < line.length && this.isWhitespace(line[current])) {
            current++;
        }

        // 3. If we hit the end of the line, clamp to the last char (Normal mode behavior)
        if (current >= line.length && line.length > 0) {
            current = line.length - 1;
        }

        return { line: lineIdx, col: current };
    }

    /**
     * Finds the last character of the line (vaguely following '$').
     */
    public static findEndOfLine(buffer: IVimBuffer, lineIdx: number): { line: number, col: number } {
        const line = buffer.getLine(lineIdx);
        const col = Math.max(0, line.length - 1);
        return { line: lineIdx, col };
    }

    private static isWhitespace(char: string): boolean {
        return /\s/.test(char);
    }
}
