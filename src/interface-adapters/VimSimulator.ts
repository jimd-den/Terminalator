/**
 * VimSimulator - Interface Adapter Layer
 * 
 * Orchestrates a Vim editing session by connecting the domain logic (VimEngine)
 * with infrastructure (FileSystem) and presentation.
 *
 * Pillar: THE FOUR-FOLD SHIELD (Strict Architecture)
 * Pillar: THE MASTER’S TOOL (Pragmatic Design Patterns)
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 *
 * Intent:
 * Acts as the authoritative controller for a file being edited.
 * Handles I/O operations (Load/Save) and delegates key processing to the engine.
 */

import { FileSystem } from '../domain/entities/FileSystem';
import { FileSystemService } from '../domain/services/FileSystemService';
import { EditorBuffer } from '../domain/entities/EditorBuffer';
import { VimEngine, VimState } from '../domain/entities/VimEngine';
import { CheckerRegistry } from './vim/CheckerRegistry';

export class VimSimulator {
    private engine: VimEngine;
    private buffer: EditorBuffer;
    private fsService: FileSystemService;
    private filename: string;
    private checkerRegistry = new CheckerRegistry();

    constructor(fs: FileSystemService, filename: string) {
        // fs is already a FileSystemService, use it directly
        this.fsService = fs;
        this.filename = filename;

        // Load content from FileSystem
        const path = filename.startsWith('/') ? filename : `/home/operator/${filename}`;
        const node = this.fsService.resolve(path);
        let content = '';

        if (node && !this.fsService.isDirectory(node)) {
            const inode = this.fsService.getInode(node.inodeId);
            content = (inode && typeof inode.content === 'string') ? inode.content : '';
        }

        // Initialize Domain Entities
        this.buffer = new EditorBuffer(filename, content);
        this.engine = new VimEngine(this.buffer);

        // Initial lint
        this.lint();
    }

    /**
     * Processes a key input and returns the current state for the UI to render.
     */
    handleInput(key: string): VimState & { lines: string[] } {
        this.engine.handleInput(key);
        this.lint();
        return this.getSnapshot();
    }

    /**
     * Executes a command-line mode command (e.g., :w, :q).
     */
    executeCommand(cmd: string): { exit: boolean; message: string } {
        const command = cmd.trim();

        if (command === ':w') {
            this.save();
            return { exit: false, message: `"${this.filename}" written` };
        } else if (command === ':q') {
            return { exit: true, message: '' };
        } else if (command === ':wq') {
            this.save();
            return { exit: true, message: '' };
        } else if (command === ':q!') {
            return { exit: true, message: '' };
        }

        return { exit: false, message: `E492: Not an editor command: ${command}` };
    }

    private lint(): void {
        const ext = this.filename.split('.').pop() || '';
        const checker = this.checkerRegistry.getCheckerForExtension(ext);
        if (checker) {
            const errors = checker.check(this.buffer.toString());
            this.engine.setLintErrors(errors);
        } else {
            this.engine.setLintErrors([]);
        }
    }

    private save(): void {
        const path = this.filename.startsWith('/') ? this.filename : `/home/operator/${this.filename}`;
        const content = this.buffer.toString();
        this.fsService.writeFile(path, content, 'w');
    }

    /**
     * Returns a snapshot of the current session state.
     */
    getSnapshot(): VimState & { lines: string[] } {
        return {
            ...this.engine.getState(),
            lines: this.buffer.getState().lines
        };
    }

    getFilename(): string {
        return this.filename;
    }
}
