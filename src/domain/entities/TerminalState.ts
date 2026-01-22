/**
 * TerminalState Entity - Domain Layer
 * 
 * Manages the interactive state of the simulated terminal.
 * Includes command history, current directory, and environment variables.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture) - Entities
 * Pillar: The Balanced Scale (SOLID / KISS) - Immutable State Pattern
 *
 * Intent:
 * Holds the snapshot of the user's session.
 * Used by commands to determine context and by the UI to render the prompt.
 */

import { FileSystem } from './FileSystem';
import { FileSystemService } from '../services/FileSystemService';

export interface TerminalState {
    currentDirectory: string;
    history: string[];
    environment: Record<string, string>;
    aliases: Record<string, string>;
    user: string;
    hostname: string;
    isLocked: boolean;
    fs: FileSystemService;
    lastExitCode: number; // Added
    callDepth: number; // Added: Track function call depth for `return`
}

/**
 * Creates the initial state for a new terminal session.
 *
 * @returns A default TerminalState object.
 */
export const createInitialTerminalState = (): TerminalState => {
    // Note: FS is typically injected or created.
    // We assume the caller handles FS injection properly.
    return {
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
        fs: new FileSystemService(new FileSystem()), // Ensure FS service wrapping
        lastExitCode: 0,
        callDepth: 0
    };
};
