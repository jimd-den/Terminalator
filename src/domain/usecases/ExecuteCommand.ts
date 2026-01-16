/**
 * ExecuteCommand Use Case - Application Logic Layer
 * 
 * Parses and executes simulated terminal commands using the Command Pattern.
 * Adheres to "The Four-Fold Shield" by relying on the Command Registry (domain service).
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Watchman’s Log (Telemetry)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * The central dispatch mechanism for user input. It interprets the string,
 * finds the appropriate command, and delegates execution.
 */

import { FileSystem } from '../entities/FileSystem';
import { TerminalState } from '../entities/TerminalState';
import { TelemetryPort } from '../ports/TelemetryPort';
import { CommandRegistry } from '../commands/CommandRegistry';
import { LsCommand } from '../commands/core/LsCommand';
import { CdCommand } from '../commands/core/CdCommand';
import { PwdCommand } from '../commands/core/PwdCommand';
import { CatCommand } from '../commands/core/CatCommand';
import { GrepCommand } from '../commands/core/GrepCommand';

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
    private registry: CommandRegistry;

    /**
     * Initializes ExecuteCommand.
     * Optionally accepts a registry. If not provided, initializes a default one
     * with core commands (ls, cd, pwd, etc.).
     *
     * @param fs - The FileSystem entity.
     * @param telemetry - The Telemetry port.
     * @param registry - Optional CommandRegistry (for dependency injection/testing).
     */
    constructor(
        protected fs: FileSystem,
        protected telemetry?: TelemetryPort,
        registry?: CommandRegistry
    ) {
        if (registry) {
            this.registry = registry;
        } else {
            this.registry = new CommandRegistry();
            this.registerCoreCommands();
        }
    }

    private registerCoreCommands() {
        this.registry.register('ls', new LsCommand(this.fs));
        this.registry.register('cd', new CdCommand(this.fs));
        this.registry.register('pwd', new PwdCommand(this.fs));
        this.registry.register('cat', new CatCommand(this.fs));
        this.registry.register('grep', new GrepCommand(this.fs));

        // Inline clear command for simplicity, or could be a class
        this.registry.register('clear', {
            execute: (_args, state) => ({
                output: '',
                newState: state,
                exitCode: 0,
                uiAction: 'CLEAR'
            })
        });
    }

    /**
     * Accessor for the registry, allowing adapters to register more commands.
     */
    getRegistry(): CommandRegistry {
        return this.registry;
    }

    execute(commandString: string, state: TerminalState): CommandResponse {
        const executeLogic = () => {
            if (!commandString.trim()) {
                return { output: '', newState: state, exitCode: 0 };
            }

            const parts = commandString.trim().split(/\s+/);
            const commandName = parts[0];
            const args = parts.slice(1);

            const command = this.registry.get(commandName);

            if (command) {
                try {
                    return command.execute(args, state);
                } catch (error: any) {
                    return {
                        output: `sh: error executing ${commandName}: ${error.message}`,
                        newState: state,
                        exitCode: 1
                    };
                }
            } else {
                return {
                    output: `sh: command not found: ${commandName}`,
                    newState: state,
                    exitCode: 127
                };
            }
        };

        if (this.telemetry) {
            return this.telemetry.trace('ExecuteCommand.execute', executeLogic, commandString, state.currentDirectory);
        }

        return executeLogic();
    }
}
