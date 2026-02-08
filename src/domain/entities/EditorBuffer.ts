/**
 * EditorBuffer - Domain Layer Entity
 *
 * Represets the content and metadata of a file being edited.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance & Purity)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Provides a pure, decoupled way to manage text buffer operations.
 * This entity does not know about cursors or Vim modes; it only knows about lines of text.
 * It is designed to be easily testable and extensible for syntax highlighting.
 */

import { IVimBuffer } from './vim/IVimBuffer';

export interface EditorBufferState {
    lines: string[];
    filename: string;
    language: string;
}

export class EditorBuffer implements IVimBuffer {
    private state: EditorBufferState;

    constructor(filename: string, content: string = '', language: string = 'plaintext') {
        this.state = {
            lines: content.split('\n'),
            filename,
            language
        };

        // Ensure at least one line
        if (this.state.lines.length === 0) {
            this.state.lines = [''];
        }
    }

    /**
     * Returns the current state of the buffer.
     */
    getState(): EditorBufferState {
        return { ...this.state, lines: [...this.state.lines] };
    }

    /**
     * Updates a single line in the buffer.
     */
    updateLine(index: number, content: string): void {
        if (index >= 0 && index < this.state.lines.length) {
            this.state.lines[index] = content;
        }
    }

    /**
     * Inserts a new line at the specified index.
     */
    insertLine(index: number, content: string = ''): void {
        this.state.lines.splice(index, 0, content);
    }

    /**
     * Deletes the line at the specified index.
     */
    deleteLine(index: number): void {
        if (this.state.lines.length > 1) {
            this.state.lines.splice(index, 1);
        } else {
            this.state.lines = [''];
        }
    }

    /**
     * Joins a line with the one below it.
     */
    joinLines(index: number): void {
        if (index >= 0 && index < this.state.lines.length - 1) {
            this.state.lines[index] += this.state.lines[index + 1];
            this.state.lines.splice(index + 1, 1);
        }
    }

    /**
     * Splits a line at the specified column index.
     */
    splitLine(lineIndex: number, colIndex: number): void {
        if (lineIndex >= 0 && lineIndex < this.state.lines.length) {
            const line = this.state.lines[lineIndex];
            const head = line.slice(0, colIndex);
            const tail = line.slice(colIndex);

            this.state.lines[lineIndex] = head;
            this.state.lines.splice(lineIndex + 1, 0, tail);
        }
    }

    /**
     * Returns the full content of the buffer as a single string.
     */
    toString(): string {
        return this.state.lines.join('\n');
    }

    get length(): number {
        return this.state.lines.length;
    }

    getLine(index: number): string {
        return this.state.lines[index] || '';
    }
}
