/**
 * ExecuteCommand Use Case - Application Logic Layer
 * 
 * Parses and executes simulated terminal commands.
 * Adheres to POSIX-compliant behavior in a simulated environment.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance & Purity)
 */

import { FileSystem, FSNode } from '../entities/FileSystem';
import { TerminalState } from '../entities/TerminalState';
import { TelemetryPort } from '../ports/TelemetryPort';

export interface CommandResponse {
    output: string;
    newState: TerminalState;
    exitCode: number;
    uiAction?: 'CLEAR';
    navigationAction?: {
        type: 'NAVIGATE';
        target: string;
        params?: any;
    };
}

export class ExecuteCommand {
    constructor(protected fs: FileSystem, protected telemetry?: TelemetryPort) { }

    execute(commandString: string, state: TerminalState): CommandResponse {
        const executeLogic = () => {
            const parts = commandString.trim().split(/\s+/);
            const command = parts[0];
            const args = parts.slice(1);

            let output = '';
            let exitCode = 0;
            let newState = { ...state };
            let uiAction: 'CLEAR' | undefined;

            switch (command) {
                case 'ls':
                    output = this.ls(newState.currentDirectory);
                    break;
                case 'cd':
                    const cdResult = this.cd(args[0] || state.environment.HOME, state);
                    output = cdResult.output;
                    newState = cdResult.newState;
                    exitCode = cdResult.exitCode;
                    break;
                case 'cat':
                    output = this.cat(args[0], state.currentDirectory);
                    break;
                case 'grep':
                    output = this.grep(args, state.currentDirectory);
                    break;
                case 'pwd':
                    output = state.currentDirectory;
                    break;
                case 'whoami':
                    output = state.user;
                    break;
                case 'clear':
                    output = '';
                    uiAction = 'CLEAR';
                    break;
                case '':
                    output = '';
                    break;
                default:
                    output = `sh: command not found: ${command}`;
                    exitCode = 127;
            }

            return { output, newState, exitCode, uiAction };
        };

        if (this.telemetry) {
            return this.telemetry.trace('ExecuteCommand.execute', executeLogic, commandString, state.currentDirectory);
        }

        return executeLogic();
    }

    private ls(path: string): string {
        const node = this.fs.getNode(path);
        if (node && node.type === 'directory' && node.children) {
            // Check for empty directory
            const files = Object.keys(node.children);
            if (files.length === 0) return '';
            return files.join('  ');
        }
        return '';
    }

    private cd(target: string, state: TerminalState): { output: string; newState: TerminalState; exitCode: number } {
        // Basic cd simulation
        let newPath = target;
        if (!target.startsWith('/')) {
            newPath = state.currentDirectory === '/' ? `/${target}` : `${state.currentDirectory}/${target}`;
        }

        // Normalize path (handle .. etc, simplified for now)
        if (target === '..') {
            const parts = state.currentDirectory.split('/').filter(p => p.length > 0);
            parts.pop();
            newPath = parts.length === 0 ? '/' : '/' + parts.join('/');
        } else if (target === '.') {
            newPath = state.currentDirectory;
        }

        const node = this.fs.getNode(newPath);
        if (node && node.type === 'directory') {
            return { output: '', newState: { ...state, currentDirectory: newPath }, exitCode: 0 };
        }
        return { output: `cd: no such file or directory: ${target}`, newState: state, exitCode: 1 };
    }

    private cat(filename: string | undefined, currentDir: string): string {
        if (!filename) return 'Usage: cat <filename>';
        const path = currentDir === '/' ? `/${filename}` : `${currentDir}/${filename}`;
        const node = this.fs.getNode(path);
        if (node && node.type === 'file') {
            return node.content || '';
        }
        return `cat: ${filename}: No such file or directory`;
    }

    private grep(args: string[], currentDir: string): string {
        if (args.length < 2) return 'Usage: grep <pattern> <filename>';
        const pattern = args[0];
        const filename = args[1];

        const path = currentDir === '/' ? `/${filename}` : `${currentDir}/${filename}`;
        const node = this.fs.getNode(path);

        if (node && node.type === 'file') {
            const content = node.content || '';
            if (content === '') return '';

            const matches: string[] = [];
            let startIndex = 0;
            let newlineIndex;

            while ((newlineIndex = content.indexOf('\n', startIndex)) !== -1) {
                const line = content.substring(startIndex, newlineIndex);
                if (line.includes(pattern)) {
                    matches.push(line);
                }
                startIndex = newlineIndex + 1;
            }

            // Check for the last line if the file doesn't end with a newline
            if (startIndex < content.length) {
                const lastLine = content.substring(startIndex);
                if (lastLine.includes(pattern)) {
                    matches.push(lastLine);
                }
            }

            return matches.join('\n');
        }

        return `grep: ${filename}: No such file or directory`;
    }
}
