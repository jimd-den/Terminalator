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
    protected options: Map<string, string> = new Map();
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
     * Supports:
     * - Bundled flags: -rvf
     * - Options with values: -m name (if defined in optionDefinitions)
     */
    protected parseArgs(args: string[], optionDefinitions: string[] = []) {
        this.flags = new Set();
        this.options = new Map();
        this.operands = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            if (arg === '--') {
                this.operands.push(...args.slice(i + 1));
                break;
            }

            if (arg.startsWith('-') && arg !== '-') {
                const flagStr = arg.substring(1);

                // Check if it's a known option that takes a value
                let handled = false;
                for (const def of optionDefinitions) {
                    if (flagStr === def) {
                        if (i + 1 < args.length) {
                            this.options.set(def, args[++i]);
                            handled = true;
                            break;
                        }
                    } else if (flagStr.startsWith(def)) {
                        // Handle attached value: -mValue
                        this.options.set(def, flagStr.substring(def.length));
                        handled = true;
                        break;
                    }
                }

                if (!handled) {
                    // Treat as flags (potentially bundled)
                    for (const char of flagStr) {
                        this.flags.add(char);
                    }
                }
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
