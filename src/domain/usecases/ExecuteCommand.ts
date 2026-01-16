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
import { MkdirCommand } from '../commands/core/MkdirCommand';
import { TouchCommand } from '../commands/core/TouchCommand';
import { RmCommand } from '../commands/core/RmCommand';
import { CpCommand } from '../commands/core/CpCommand';
import { MvCommand } from '../commands/core/MvCommand';
import { EchoCommand } from '../commands/core/EchoCommand';
import { HeadCommand } from '../commands/core/HeadCommand';
import { TailCommand } from '../commands/core/TailCommand';
import { WcCommand } from '../commands/core/WcCommand';
import { ChmodCommand } from '../commands/core/ChmodCommand';
import { ChownCommand } from '../commands/core/ChownCommand';
import { DuCommand } from '../commands/core/DuCommand';
import { LnCommand } from '../commands/core/LnCommand';
import { DfCommand } from '../commands/core/DfCommand';
import { FindCommand } from '../commands/core/FindCommand';
import { SedCommand } from '../commands/core/SedCommand';
import { AwkCommand } from '../commands/core/AwkCommand';
import { XargsCommand } from '../commands/core/XargsCommand';

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
        this.registry.register('mkdir', new MkdirCommand(this.fs));
        this.registry.register('touch', new TouchCommand(this.fs));
        this.registry.register('rm', new RmCommand(this.fs));
        this.registry.register('cp', new CpCommand(this.fs));
        this.registry.register('mv', new MvCommand(this.fs));
        this.registry.register('echo', new EchoCommand(this.fs));
        this.registry.register('head', new HeadCommand(this.fs));
        this.registry.register('tail', new TailCommand(this.fs));
        this.registry.register('wc', new WcCommand(this.fs));
        this.registry.register('chmod', new ChmodCommand(this.fs));
        this.registry.register('chown', new ChownCommand(this.fs));
        this.registry.register('du', new DuCommand(this.fs));
        this.registry.register('ln', new LnCommand(this.fs));
        this.registry.register('df', new DfCommand(this.fs));
        this.registry.register('find', new FindCommand(this.fs));
        this.registry.register('find', new FindCommand(this.fs));
        this.registry.register('sed', new SedCommand(this.fs));
        this.registry.register('awk', new AwkCommand(this.fs));
        this.registry.register('xargs', new XargsCommand(this.fs, (name) => this.registry.get(name)));

        // Inline clear command for simplicity, or could be a class
        this.registry.register('clear', {
            execute: (_args, state, _input) => ({
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

    async execute(input: string, state: TerminalState): Promise<CommandResponse> {
        const executeLogic = async (): Promise<CommandResponse> => {
            if (!input.trim()) {
                return { output: '', newState: state, exitCode: 0 };
            }

            // Pipe Splitting
            const pipeParts = this.splitByPipe(input);

            let currentState = state;
            let previousOutput: string | undefined = undefined;
            let finalExitCode = 0;
            let finalUiAction: 'CLEAR' | undefined = undefined;

            for (let i = 0; i < pipeParts.length; i++) {
                const commandString = pipeParts[i].trim();
                if (!commandString) continue;

                const args = this.parseArgs(commandString);
                const commandName = args.shift();

                if (!commandName) continue;

                const command = this.registry.get(commandName);

                if (!command) {
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
                uiAction: finalUiAction
            };
        };

        if (this.telemetry) {
            return this.telemetry.trace('ExecuteCommand.execute', executeLogic, input, state.currentDirectory);
        }

        return executeLogic();
    }

    private splitByPipe(input: string): string[] {
        const parts: string[] = [];
        let current = '';
        let inSingleQuote = false;
        let inDoubleQuote = false;

        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            if (char === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
            else if (char === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;

            if (char === '|' && !inSingleQuote && !inDoubleQuote) {
                parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current);
        return parts;
    }

    private parseArgs(input: string): string[] {
        const args: string[] = [];
        let current = '';
        let inSingleQuote = false;
        let inDoubleQuote = false;

        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
                if (current.length > 0) {
                    args.push(current);
                    current = '';
                }
            } else if (char === "'" && !inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
                current += char;
            } else if (char === '"' && !inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
                current += char;
            } else {
                current += char;
            }
        }

        if (current.length > 0) args.push(current);
        return args;
    }
}
