/**
 * ICommand Interface - Domain Layer
 *
 * Defines the contract for all terminal commands.
 * Adheres to the Command Pattern for extensibility and OCP.
 *
 * Pillar: The Master’s Tool (Pragmatic Design Patterns)
 * Pillar: The Four-Fold Shield (Strict Architecture)
 */

import { FileSystemService } from '../../domain/services/FileSystemService';
import { TerminalState } from '../entities/TerminalState';
import { CommandResponse } from '../entities/Command';
import { ProcessContext } from '../entities/ProcessContext';

export { CommandResponse };

export interface CommandContext extends ProcessContext {
    // Alias for backward compatibility if needed, or extend
}

export interface ICommand {
    /**
     * Executes the command.
     *
     * @param args - Arguments passed to the command.
     * @param state - The current terminal state.
     * @returns A promise resolving to the command response.
     */
    execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> | CommandResponse;
}
