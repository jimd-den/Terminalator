/**
 * VimSimulator - Interface Adapter Layer
 * 
 * Simulates a vanilla Vim environment for mobile typing tasks.
 * Supports basic modes (Normal, Insert) and command-line mode.
 *
 * Pillar: The Storyteller’s Code (Literate Documentation)
 * Pillar: The Four-Fold Shield (Strict Architecture)
 *
 * Intent:
 * Provides a familiar editing environment for users to write code and notes.
 * Keeps logic separate from the React UI components.
 */

export type VimMode = 'NORMAL' | 'INSERT' | 'COMMAND';

export class VimSimulator {
    private buffer: string[] = [];
    private mode: VimMode = 'NORMAL';
    private cursor: { x: number; y: number } = { x: 0, y: 0 };
    private currentFile: string = '';

    constructor(filename: string, content: string = '') {
        this.currentFile = filename;
        this.buffer = content.split('\n');
    }

    /**
     * Processes input characters based on the current Vim mode.
     *
     * @param input - The character or key code entered.
     * @returns The updated display buffer and mode.
     */
    handleInput(input: string): { output: string[], mode: VimMode } {
        if (this.mode === 'NORMAL') {
            if (input === 'i') {
                this.mode = 'INSERT';
            } else if (input === ':') {
                this.mode = 'COMMAND';
            }
        } else if (this.mode === 'INSERT') {
            if (input === 'ESC') {
                this.mode = 'NORMAL';
            } else {
                // Simple append to current line for simulation
                this.buffer[this.cursor.y] = (this.buffer[this.cursor.y] || '') + input;
            }
        } else if (this.mode === 'COMMAND') {
            if (input === 'q') return { output: ['Vim closed'], mode: 'NORMAL' };
            if (input === 'wq') return { output: ['File saved', 'Vim closed'], mode: 'NORMAL' };
            this.mode = 'NORMAL';
        }

        return { output: this.getDisplayBuffer(), mode: this.mode };
    }

    private getDisplayBuffer(): string[] {
        const statusLine = `[${this.mode}] ${this.currentFile}  L:${this.cursor.y + 1} C:${this.cursor.x + 1}`;
        return [...this.buffer, '---', statusLine];
    }

    getMode(): VimMode {
        return this.mode;
    }
}
