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

// Commands
import { LSCommand } from '../../interface-adapters/commands/ls';
import { CDCommand } from '../../interface-adapters/commands/cd';
import { MkdirCommand } from '../../interface-adapters/commands/mkdir';
import { CatCommand } from '../../interface-adapters/commands/cat';
import { PwdCommand } from '../../interface-adapters/commands/pwd';
import { WhoamiCommand } from '../../interface-adapters/commands/whoami';
import { ClearCommand } from '../../interface-adapters/commands/clear';
import { GrepCommand } from '../../interface-adapters/commands/grep';

export class ExecuteCommand {
    protected registry: Map<string, ICommand>;

    constructor(protected fs: FileSystem) {
        this.registry = new Map();
        this.registerCommands();
    }

    private registerCommands() {
        this.register(new LSCommand(this.fs));
        this.register(new CDCommand(this.fs));
        this.register(new MkdirCommand(this.fs));
        this.register(new CatCommand(this.fs));
        this.register(new PwdCommand());
        this.register(new WhoamiCommand());
        this.register(new ClearCommand());
        this.register(new GrepCommand(this.fs));
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
             // We only support redirection at the end of the command string for now
             // Regex to capture: (command part) (>> or >) (file part)
             const redirectMatch = commandString.match(/^(.*?)(\>\>|\>)(.*?)$/);
             
             if (redirectMatch) {
                 runCommand = redirectMatch[1].trim();
                 const operator = redirectMatch[2];
                 const fileObj = redirectMatch[3].trim();
                 
                 // Handle case where fileObj might be empty or invalid?
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
                
                // Update state if command changed it (e.g. cd)
                // Note: In real bash, piped commands run in subshells and don't affect parent state usually,
                // but for our game, we might want to allow it or stick to strict POSIX.
                // Strict POSIX: `cd .. | ls` -> ls runs in .., but parent shell stays.
                // Simplified: Let's apply state changes sequentially for now, unless we want strict subshells.
                // Given "cd .. | ls" is rare, but "cd .." is common.
                // Let's adopt a simplified model where state propagates to next command but persisted state 
                // depends on if it's the last one? No, state propagation in a pipeline context is tricky.
                // For now, let's accumulate state changes.

                if (response.newState) {
                    currentState = { ...currentState, ...response.newState };
                }

                lastResponse = { ...response, newState: currentState };

                // Set output as stdin for next command
                // If exit code != 0, should we stop? Bash continues but signals error.
                // We'll continue for now.
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

    private async executeSingleCommand(commandString: string, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        const parts = commandString.trim().split(/\s+/);
        const commandName = parts[0];
        const args = parts.slice(1);

        const command = this.registry.get(commandName);

        if (!command) {
            return {
                output: `sh: command not found: ${commandName}`,
                exitCode: 127
            };
        }

        const context: ProcessContext = {
            env: state.environment,
            cwd: state.currentDirectory,
            user: state.user,
            stdin: stdin
        };

        try {
            return await command.execute(args, context, state);
        } catch (error: any) {
            return {
                output: `sh: execution error: ${error.message}`,
                exitCode: 1
            };
        }
    }
}
