/**
 * CommandRegistry - Domain Layer
 *
 * A registry to hold all available commands.
 * Allows dynamic registration and lookup of commands.
 *
 * Pillar: The Master’s Tool (Pragmatic Design Patterns)
 * Pillar: The Balanced Scale (SOLID / KISS)
 */

import { ICommand } from './ICommand';

export class CommandRegistry {
    private commands: Map<string, ICommand> = new Map();

    /**
     * Registers a command under a specific name.
     *
     * @param name - The name of the command (e.g., 'ls').
     * @param command - The command instance.
     */
    register(name: string, command: ICommand): void {
        this.commands.set(name, command);
    }

    /**
     * Retrieves a command by name.
     *
     * @param name - The name of the command to retrieve.
     * @returns The command instance or undefined if not found.
     */
    get(name: string): ICommand | undefined {
        return this.commands.get(name);
    }

    /**
     * Returns a list of all registered command names.
     */
    getCommandNames(): string[] {
        return Array.from(this.commands.keys());
    }
}
