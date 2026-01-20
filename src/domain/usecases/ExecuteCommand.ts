/**
 * ExecuteCommand Use Case - Application Logic Layer
 * 
 * Parses and executes simulated terminal commands using the Command Pattern.
 * Adheres to "The Four-Fold Shield" by relying on the Command Registry (domain service)
 * and "ShellParser" (domain service) for text interpretation.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Watchman’s Log (Telemetry)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * The central dispatch mechanism for user input. It interprets the string
 * using the ShellParser, finds the appropriate command in the Registry,
 * and delegates execution.
 */

import { FileSystem } from '../entities/FileSystem';
import { TerminalState } from '../entities/TerminalState';
import { TelemetryPort } from '../ports/TelemetryPort';
import { CommandRegistry } from '../commands/CommandRegistry';
import { ShellParser } from '../services/ShellParser';
import { CoreUtilsModule } from '../modules/CoreUtilsModule';
import { SystemUtilsModule } from '../modules/SystemUtilsModule';
import { IBinaryRunner } from '../interfaces/IBinaryRunner';

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
    private parser: ShellParser;

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
        registry?: CommandRegistry,
        protected binaryRunner?: IBinaryRunner
    ) {
        this.parser = new ShellParser();

        if (registry) {
            this.registry = registry;
        } else {
            this.registry = new CommandRegistry();
            this.registerCoreCommands();
        }
    }

    private registerCoreCommands() {
        // Use the CoreUtilsModule to register all standard commands
        const coreModule = new CoreUtilsModule(this.fs);
        coreModule.register(this.registry);

        // Register System Utilities
        const systemModule = new SystemUtilsModule();
        systemModule.register(this.registry);
    }

    /**
     * Accessor for the registry, allowing adapters to register more commands.
     */
    getRegistry(): CommandRegistry {
        return this.registry;
    }

    async execute(input: string, state: TerminalState): Promise<CommandResponse> {
        // Ensure state uses the FileSystem of this executor context
        // This is crucial for tests where setup modifies the executor's FS, but state might have a different default FS.
        state.fs = this.fs;

        const executeLogic = async (): Promise<CommandResponse> => {
            if (!input.trim()) {
                return { output: '', newState: state, exitCode: 0 };
            }

            // Use the ShellParser Service to tokenize the input
            const pipeline = this.parser.parse(input);

            let currentState = state;
            let previousOutput: string | undefined = undefined;
            let finalExitCode = 0;
            let finalUiAction: 'CLEAR' | undefined = undefined;

            let finalNavigationAction: any = undefined;

            for (const step of pipeline) {
                const commandName = step.command;
                const args = step.args;

                const command = this.registry.get(commandName);

                if (!command) {
                    // Check if it is a file path (starts with / or ./ or ../)
                    if (commandName.startsWith('/') || commandName.startsWith('./') || commandName.startsWith('../')) {
                        const dentry = this.fs.resolve(commandName, currentState.currentDirectory);
                        if (dentry && !dentry.isDirectory) {
                            const inode = this.fs.getInode(dentry.inodeId);
                            // Check executable bit (0o111) - minimal check
                            if (inode && (inode.mode & 0o111)) {
                                if (this.binaryRunner && inode.content instanceof Uint8Array) {
                                    try {
                                        // Execute Binary
                                        // Env should ideally come from state, passing empty for now or parser expansion
                                        const response = await this.binaryRunner.run(inode.content, args, {});
                                        previousOutput = response.output;
                                        currentState = response.newState; // State updates (state is mutable reference usually, but good to return)
                                        finalExitCode = response.exitCode;
                                        continue;
                                    } catch (e: any) {
                                        return {
                                            output: `sh: ${commandName}: cannot execute binary file: ${e.message}`,
                                            newState: currentState,
                                            exitCode: 126
                                        };
                                    }
                                }
                            }
                            return {
                                output: `sh: ${commandName}: Permission denied`,
                                newState: currentState,
                                exitCode: 126
                            };
                        }
                        return {
                            output: `sh: ${commandName}: No such file or directory`,
                            newState: currentState,
                            exitCode: 127
                        };
                    }

                    return {
                        output: `sh: command not found: ${commandName}`,
                        newState: currentState,
                        exitCode: 127
                    };
                }

                try {
                    // Execute with input from previous command (if any)
                    const response = await command.execute(args, currentState, previousOutput);

                    previousOutput = response.output;
                    currentState = response.newState;
                    finalExitCode = response.exitCode;
                    if (response.uiAction) finalUiAction = response.uiAction;
                    if (response.navigationAction) finalNavigationAction = response.navigationAction;

                } catch (error: any) {
                    return {
                        output: `sh: error executing ${commandName}: ${error.message}`,
                        newState: currentState,
                        exitCode: 1
                    };
                }
            }

            return {
                output: previousOutput || '',
                newState: currentState,
                exitCode: finalExitCode,
                uiAction: finalUiAction,
                navigationAction: finalNavigationAction
            };
        };

        if (this.telemetry) {
            return this.telemetry.trace('ExecuteCommand.execute', executeLogic, input, state.currentDirectory);
        }

        return executeLogic();
    }
}
