/**
 * XargsCommand - Core Command
 *
 * Builds and executes command lines from standard input.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to convert stdin into arguments for another command.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandRegistry } from '../../commands/CommandRegistry'; // Need registry access?
// Xargs needs to execute other commands.
// It receives the registry or uses ExecuteCommand? 
// Ideally commands are independent. 
// But xargs meta-executes.
// Only way is if XargsCommand has access to a command executor or registry.
// We can inject `CommandRegistry` into `XargsCommand` or pass it via context.
// `ExecuteCommand` invokes `XargsCommand`. `XargsCommand` needs to invoke `ExecuteCommand` again?
// Or just look up command in registry?
// `ExecuteCommand` has the registry. `XargsCommand` needs it.
// We can refactor `ExecuteCommand` to pass a "callback" or the registry to commands?
// "CommandContext" in `ICommand.ts` was empty. Maybe use that?
// For now, I will introduce a hack or better, pass registry in constructor if possible.
// But `ExecuteCommand` creates instances using `new`. 
// Wait, `ExecuteCommand` registers instances.
// I can change `ExecuteCommand` to pass registry to `XargsCommand` constructor.
// But `XargsCommand` executes a string, so it needs `ExecuteCommand.execute` or similar to handle redirection/pipes in subcommands?
// Usually xargs just runs simple commands.
// Let's pass `CommandRegistry` to `XargsCommand` constructor.
// No, circular dependency potential if implementation files import each other.
// `CommandRegistry` is in `../commands/CommandRegistry`.
// `XargsCommand` is in `../commands/core/XargsCommand`.
// Should be fine.

import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

// We need an interface for the Executor or Registry to avoid tight coupling.
interface ICommandExecutor {
    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse | Promise<CommandResponse>;
}

export class XargsCommand implements ICommand {
    // We need a way to look up commands. 
    // We'll accept a "command provider" function or similar.
    // For now, we ca NOT easily access registry unless we change `registerCoreCommands`.
    // I will use a placeholder or assume `echo` for simplicity if complexity is too high, but user asked for xargs.
    // Let's modify `ExecuteCommand` to pass a `lookup` function to commands? 
    // Or just simple: xargs only supports `echo` and `ls` hardcoded? No, that's bad.

    // Better: `ExecuteCommand` sets a static or singleton? No.
    // Xargs is special.
    // Let's pass the Registry to the constructor of XargsCommand.

    private getCommand: (name: string) => ICommand | undefined;

    constructor(private fs: FileSystemService, commandLookup: (name: string) => ICommand | undefined) {
        this.getCommand = commandLookup;
    }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        // Syntax: xargs [cmd [initial-args]]
        // Default cmd is echo.

        // Input comes from stdin (input arg).
        if (input === undefined) {
            return { output: 'xargs: no input (stdin required)', newState: state, exitCode: 1 };
        }

        let targetCmdName = 'echo';
        let targetArgs: string[] = [];

        if (args.length > 0) {
            targetCmdName = args[0];
            targetArgs = args.slice(1);
        }

        // Split input by whitespace to get arguments
        // xargs (default) splits by spaces/newlines.
        const inputArgs = input.trim().split(/\s+/);

        // Append input args to target args
        const finalArgs = [...targetArgs, ...inputArgs];

        // Find command
        const command = this.getCommand(targetCmdName);
        if (!command) {
            return { output: `xargs: ${targetCmdName}: command not found`, newState: state, exitCode: 127 };
        }

        // Execute
        // Note: xargs usually runs command ONCE with all args, or multiple times if too many.
        // We run once with all args.
        try {
            // Context for the inner command should ideally not have the consumed stdin.
            const innerContext: ProcessContext = {
                ...context,
                stdin: undefined
            };
            return await command.execute(finalArgs, innerContext, state);
        } catch (e: any) {
            return { output: `xargs: error: ${e.message}`, newState: state, exitCode: 1 };
        }
    }
}
