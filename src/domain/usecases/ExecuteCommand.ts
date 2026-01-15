/**
 * ExecuteCommand Use Case - Application Logic Layer
 * 
 * Parses and executes simulated terminal commands.
 * Adheres to POSIX-compliant behavior in a simulated environment.
 */

import { FileSystem, FSNode } from '../entities/FileSystem';
import { TerminalState } from '../entities/TerminalState';
import { Logger } from '../../infrastructure/telemetry/Logger';

export interface CommandResponse {
    output: string;
    newState: TerminalState;
    exitCode: number;
    navigationAction?: {
        type: 'NAVIGATE';
        target: string;
        params?: any;
    };
}

export class ExecuteCommand {
    constructor(protected fs: FileSystem) { }

    execute(commandString: string, state: TerminalState): CommandResponse {
        return Logger.trace('ExecuteCommand.execute', () => {
            const parts = commandString.trim().split(/\s+/);
            const command = parts[0];
            const args = parts.slice(1);

            let output = '';
            let exitCode = 0;
            let newState = { ...state };

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
                case 'pwd':
                    output = state.currentDirectory;
                    break;
                case 'whoami':
                    output = state.user;
                    break;
                case 'clear':
                    output = ''; // Handle in UI
                    break;
                case '':
                    output = '';
                    break;
                default:
                    output = `sh: command not found: ${command}`;
                    exitCode = 127;
            }

            return { output, newState, exitCode };
        }, { commandString, currentDir: state.currentDirectory });
    }

    private ls(path: string): string {
        const node = this.fs.getNode(path);
        if (node && node.type === 'directory' && node.children) {
            return Object.keys(node.children).join('  ');
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
            newPath = '/' + parts.join('/');
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
}
