/**
 * EdCommand - Core Command
 *
 * The standard text editor.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * A simplified, scriptable implementation of the `ed` text editor.
 * Supports basic commands: a, d, p, w, q, and line addressing.
 * Non-interactive: intended for use with scripts/pipes in this environment.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class EdCommand implements ICommand {
    private buffer: string[] = [];
    private currentLine = 0;
    private filename = '';
    private mode: 'command' | 'input' = 'command';
    private inputBuffer: string[] = []; // Lines collected during input mode

    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        // Reset state for each execution
        this.buffer = [];
        this.currentLine = 0;
        this.filename = '';
        this.mode = 'command';
        this.inputBuffer = [];

        // 1. Load File
        if (args.length > 0) {
            this.filename = args[0];
            const resolvedPath = this.resolvePath(this.filename, state);
            try {
                // If file exists, load it
                if (this.fs.resolveNode(resolvedPath)) {
                    const content = this.fs.readFile(resolvedPath);
                    if (content) {
                        this.buffer = content.split('\n');
                        // Handle potential trailing newline split issue if file ends with \n
                        // Typical split "a\n" -> ["a", ""]. ed buffer usually doesn't keep the empty line unless it's real.
                        // We'll trust split for now but sanitize if needed.
                        this.currentLine = this.buffer.length;
                    }
                }
                // Else new file, empty buffer
            } catch (e) {
                // Ignore read errors, treat as new file or error?
                // POSIX says "No such file or directory" warning but continues.
            }
        }

        // 2. Process Input Script
        // If input is not provided, we can't be interactive.
        if (!input) {
            return {
                output: 'ed: interactive mode not supported (provide script via stdin)',
                newState: state,
                exitCode: 1
            };
        }

        const scriptLines = input.split('\n');
        const outputLines: string[] = [];

        // Output file size on load if file existed (standard ed behavior)
        // We skip that for now to keep output clean unless standard requires it strictly.
        // POSIX: "The number of bytes ... shall be written..."

        for (const line of scriptLines) {
            if (this.mode === 'input') {
                if (line === '.') {
                    this.mode = 'command';
                    // Insert collected lines into buffer
                    this.buffer.splice(this.currentLine, 0, ...this.inputBuffer);
                    this.currentLine += this.inputBuffer.length;
                    this.inputBuffer = [];
                } else {
                    this.inputBuffer.push(line);
                }
            } else {
                // Command Mode
                const trimmed = line.trim();
                if (!trimmed) continue;
                this.processCommand(trimmed, outputLines, state);
            }
        }

        return {
            output: outputLines.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }

    private processCommand(cmdStr: string, output: string[], state: TerminalState): void {
        // Parse address and command char
        // E.g., "1,2p", "d", "1d", "w", "q"

        // Regex to split address from command
        // Addresses: numbers, ., $, ranges with ,
        // Command: single char

        // Simple parser
        const match = cmdStr.match(/^([0-9.,$]*)(.*)$/);
        if (!match) return;

        const addrStr = match[1];
        const command = match[2];

        if (!command) return; // Only address? prints line usually.

        const cmdChar = command[0];
        const param = command.slice(1).trim(); // Filename for w/r etc.

        let startLine = this.currentLine;
        let endLine = this.currentLine;

        if (addrStr) {
            const range = this.parseAddress(addrStr);
            startLine = range.start;
            endLine = range.end;
        }

        switch (cmdChar) {
            case 'p':
                // Print lines
                for (let i = startLine; i <= endLine; i++) {
                    if (i > 0 && i <= this.buffer.length) {
                        output.push(this.buffer[i - 1]);
                    }
                }
                this.currentLine = endLine;
                break;
            case 'd':
                // Delete lines
                // Deleting invalidates indices.
                // count how many to delete
                const count = endLine - startLine + 1;
                if (startLine > 0 && startLine <= this.buffer.length) {
                    this.buffer.splice(startLine - 1, count);
                    // Current line becomes the line after the deleted range,
                    // or the last line if we deleted the end.
                    this.currentLine = Math.min(startLine, this.buffer.length);
                }
                break;
            case 'a':
                // Append
                this.mode = 'input';
                // Append happens AFTER the addressed line.
                // If address is 0 (empty buffer), append at start.
                this.currentLine = endLine; // Set insertion point
                break;
            case 'w':
                // Write
                let target = this.filename;
                if (param) target = param;
                if (!target) {
                    output.push('?'); // Error: no current filename
                    break;
                }
                const path = this.resolvePath(target, state);
                const content = this.buffer.join('\n');
                try {
                    this.fs.writeFile(path, content, 'w');
                    // ed writes bytes count
                    output.push(content.length.toString());
                } catch (e) {
                    output.push('?');
                }
                break;
            case 'q':
                // Quit - handled by execution finishing
                break;
            default:
                output.push('?'); // Unknown command
                break;
        }
    }

    private parseAddress(addr: string): { start: number, end: number } {
        // Handle "1,2", "1", "$", ".", ".,$"
        const parts = addr.split(',');

        const parseSingle = (s: string): number => {
            if (s === '.') return this.currentLine;
            if (s === '$') return this.buffer.length;
            const n = parseInt(s, 10);
            return isNaN(n) ? this.currentLine : n;
        };

        if (parts.length === 1) {
            const val = parseSingle(parts[0]);
            return { start: val, end: val };
        } else {
            return { start: parseSingle(parts[0]), end: parseSingle(parts[1]) };
        }
    }
}
