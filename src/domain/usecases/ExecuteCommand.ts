/**
 * ExecuteCommand Use Case - Application Logic Layer
 * 
 * Parses and executes simulated terminal commands using a Registry pattern.
 * Adheres to POSIX-compliant behavior in a simulated environment.
 * Supports Piping (|) and Redirection (>, >>).
 */

import { FileSystem } from '../entities/FileSystem';
import { TerminalState } from '../entities/TerminalState';
import { Logger } from '../../infrastructure/telemetry/Logger';
import { ICommand, CommandResponse } from '../entities/Command';
import { ProcessContext } from '../entities/ProcessContext';
import { ProcessManager } from './ProcessManager';

export class ExecuteCommand {
    protected registry: Map<string, ICommand>;
    protected processManager: ProcessManager;

    constructor(protected fs: FileSystem, commands: ICommand[] = [], processManager?: ProcessManager) {
        this.registry = new Map();
        commands.forEach(cmd => this.register(cmd));
        this.processManager = processManager || new ProcessManager();
    }

    protected register(command: ICommand) {
        this.registry.set(command.name, command);
    }

    async execute(commandString: string, state: TerminalState): Promise<CommandResponse> {
        if (!commandString.trim()) {
            return { output: '', exitCode: 0, newState: state };
        }

        return Logger.trace('ExecuteCommand.execute', async () => {
            // 0. Handle Redirection
            let runCommand = commandString;
            let redirectTarget: string | undefined = undefined;
            let redirectMode: 'w' | 'a' = 'w';

            // Check for redirection operators > and >>
            const redirectMatch = commandString.match(/^(.*?)(\>\>|\>)(.*?)$/);

            if (redirectMatch) {
                runCommand = redirectMatch[1].trim();
                const operator = redirectMatch[2];
                const fileObj = redirectMatch[3].trim();

                if (fileObj) {
                    redirectTarget = fileObj;
                    redirectMode = operator === '>>' ? 'a' : 'w';
                }
            }

            // 1. Handle Piping
            const pipeline = runCommand.split('|');

            let currentStdin: string | undefined = undefined;
            let lastResponse: CommandResponse = { output: '', exitCode: 0, newState: state };
            let currentState = state;

            for (let i = 0; i < pipeline.length; i++) {
                const cmdStr = pipeline[i].trim();

                // Execute individual command part
                const response = await this.executeSingleCommand(cmdStr, currentState, currentStdin);

                if (response.newState) {
                    currentState = { ...currentState, ...response.newState };
                }

                lastResponse = { ...response, newState: currentState };
                currentStdin = response.output;
            }

            // 2. Apply Redirection if present
            if (redirectTarget && lastResponse.exitCode === 0) {
                try {
                    this.fs.writeFile(redirectTarget, lastResponse.output, redirectMode, currentState.currentDirectory);
                    // If redirected, output is silent (standard shell behavior)
                    lastResponse.output = '';
                } catch (e: any) {
                    lastResponse.output = `sh: ${e.message}`;
                    lastResponse.exitCode = 1;
                }
            }

            return lastResponse;

        }, { commandString, currentDir: state.currentDirectory });
    }

    private expandVariables(text: string, env: Record<string, string>): string {
        return text.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) => {
            return env[key] || '';
        });
    }

    protected getFileSystem(state: TerminalState): FileSystem {
        return this.fs;
    }

    private async executeSingleCommand(commandString: string, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        // Expand variables before parsing args
        const expandedCommand = this.expandVariables(commandString, state.environment);

        // Alias Expansion
        // We need to check the first word for alias match
        const initialParts = expandedCommand.trim().split(/\s+/);
        const firstWord = initialParts[0];

        // Check aliases if defined (state.aliases might be undefined if old state passed, guard it)
        let finalCommandString = expandedCommand;
        if (state.aliases && state.aliases[firstWord]) {
            const aliasValue = state.aliases[firstWord];
            // Replace first word with alias value
            // Avoid infinite recursion by doing single pass
            if (aliasValue !== firstWord) {
                // simple sub
                finalCommandString = aliasValue + expandedCommand.substring(firstWord.length);
            }
        }

        // Handle quoted strings to allow spaces in arguments?
        // Basic split for now, robust parsing requires a tokenizer but this suffices for simulations
        const parts = finalCommandString.trim().split(/\s+/);
        const commandName = parts[0];
        const args = parts.slice(1);

        const command = this.registry.get(commandName);

        if (!command) {
            return {
                output: `sh: command not found: ${commandName}`,
                exitCode: 127
            };
        }

        const fs = this.getFileSystem(state);
        const context: ProcessContext = {
            env: state.environment,
            cwd: state.currentDirectory,
            user: state.user,
            stdin: stdin,
            fs: fs
        };

        // Spawn Process (Ephemeral)
        // Standard shell paradigm: shell forks/execs. Here we just track it.
        const process = this.processManager.spawn(commandName, args, state.user, 100); // Parent 100 (sh)

        try {
            const response = await command.execute(args, context, state);

            // Terminate Process after execution
            this.processManager.kill(process.pid);

            return response;
        } catch (error: any) {
            this.processManager.kill(process.pid);
            return {
                output: `sh: execution error: ${error.message}`,
                exitCode: 1
            };
        }
    }
}
