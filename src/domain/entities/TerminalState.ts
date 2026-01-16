/**
 * TerminalState Entity - Domain Layer
 * 
 * Manages the interactive state of the simulated terminal.
 * Includes command history, current directory, and environment variables.
 */

import { FileSystem } from './FileSystem';

export interface TerminalState {
    currentDirectory: string;
    history: string[];
    environment: Record<string, string>;
    aliases: Record<string, string>;
    user: string;
    hostname: string;
    isLocked: boolean;
}

export const createInitialTerminalState = (): TerminalState => ({
    currentDirectory: '/home/operator',
    history: [],
    environment: {
        PATH: '/bin:/usr/bin',
        USER: 'operator',
        HOME: '/home/operator',
        TERM: 'xterm-256color',
    },
    aliases: {
        'll': 'ls -l',
        'la': 'ls -a'
    },
    user: 'operator',
    hostname: 'mainframe-01',
    isLocked: false,
});
