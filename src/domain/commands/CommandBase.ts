/**
 * CommandBase - Domain Layer
 *
 * Abstract base class for all Commands.
 * Provides DRY argument parsing and path resolution.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The DRY Principle (Shared Logic)
 */

import { ICommand, CommandResponse } from './ICommand';
import { ProcessContext } from '../entities/ProcessContext';
import { TerminalState } from '../entities/TerminalState';

export abstract class CommandBase implements ICommand {
    /**
     * Parsing result structure
     */
    protected flags: Set<string> = new Set();
    protected operands: string[] = [];

    /**
     * Template Method pattern for execution.
     */
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        this.parseArgs(args);
        return this.executeInternal(args, this.flags, this.operands, context, state);
    }

    /**
     * Concrete execution logic to be implemented by subclasses.
     */
    protected abstract executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> | CommandResponse;

    /**
     * Parses flags (starting with -) and operands.
     */
    private parseArgs(args: string[]) {
        this.flags = new Set();
        this.operands = [];

        for (const arg of args) {
            if (arg.startsWith('-')) {
                // Should we handle bundled flags like -rf?
                // Simplest is treat the string as the flag '-rf'.
                // Or split it?
                // Current legacy commands logic was `includes('r')`.
                // For better usage, let's store the full flag string.
                this.flags.add(arg);
            } else {
                this.operands.push(arg);
            }
        }
    }

    /**
     * Helper to check for a specific flag char within any flag argument.
     * e.g. hasFlag('r') checks for '-r', '-rf', '-fr', etc.
     */
    protected hasFlag(char: string): boolean {
        for (const flag of this.flags) {
            if (flag.includes(char)) return true;
        }
        return false;
    }
}
