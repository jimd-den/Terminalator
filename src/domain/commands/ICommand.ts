/**
 * ICommand Interface - Domain Layer
 *
 * Defines the contract for all terminal commands.
 * Adheres to the Command Pattern for extensibility and OCP.
 *
 * Pillar: The Master’s Tool (Pragmatic Design Patterns)
 * Pillar: The Four-Fold Shield (Strict Architecture)
 */

import { TerminalState } from '../entities/TerminalState';
import { CommandResponse } from '../usecases/ExecuteCommand';

export interface CommandContext {
    // Context can provide access to infrastructure or other domain services if needed
    // For now, it might be empty or provide a way to access the file system if passed down
    // But typically commands operate on the state and return a new state.
    // However, commands like 'ls' need to read the FS.
    // So we should pass the FS provider here or inject it into the command constructor.
}

export interface ICommand {
    /**
     * Executes the command.
     *
     * @param args - Arguments passed to the command.
     * @param state - The current terminal state.
     * @returns A promise resolving to the command response.
     */
    execute(args: string[], state: TerminalState, input?: string): Promise<CommandResponse> | CommandResponse;
}
