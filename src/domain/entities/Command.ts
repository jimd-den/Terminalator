/**
 * Command Interface - Domain Layer
 * 
 * Defines the contract for all executable commands in the system.
 * Part of the Command/Strategy pattern implementation.
 */

import { ProcessContext } from './ProcessContext';
import { FileSystemService } from '../services/FileSystemService';
import { TerminalState } from './TerminalState';

export interface CommandResponse {
    output: string;
    exitCode: number;
    newState?: Partial<TerminalState>; // Commands can request state updates
    uiAction?: 'CLEAR'; // Special actions for the UI
    navigationAction?: {
        type: 'NAVIGATE';
        target: string;
        params?: any;
    };
    controlFlow?: 'RETURN' | 'BREAK' | 'CONTINUE' | 'EXIT';
    command?: string; // [NEW] Context: The command that produced this response
    utility?: string; // [NEW] Context: The semantic utility name (e.g., 'grep')
    metadata?: {
        renderType?: 'ls-pretty' | 'system-alert' | 'fish-style' | 'archive-widget' | 'scheme-trace';
        data?: any;
    };
    executionStats?: {
        timeMs: number;
        memoryUsed: number;
        iterations: number;
    };
}

import { TheatricalVerb } from '../services/PresentationDirector';

export interface CommandMetadata {
    verb: TheatricalVerb;
    style?: 'NORMAL' | 'GLITCH' | 'SYSTEM_ALERT';
}

export interface ICommand {
    /**
     * The name of the command (e.g., 'ls', 'cd')
     */
    name: string;

    /**
     * Brief help text for the command
     */
    description: string;

    /**
     * Returns metadata for theatrical presentation.
     */
    getMetadata?(): CommandMetadata;

    /**
     * Execute the command with the given arguments and context.
     * 
     * @param args - Array of string arguments passed to the command
     * @param context - The process context (env, cwd, user)
     * @param state - The full terminal state (read-only mostly, unless state update needed)
     * @returns Promise resolving to the command response
     */
    execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse>;
}
