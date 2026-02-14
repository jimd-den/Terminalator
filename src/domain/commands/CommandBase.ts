/**
 * CommandBase - Domain Layer
 *
 * Abstract base class for all Commands.
 * Provides DRY argument parsing and path resolution.
 * Implements IStructuredCommand to support combinatorial generation.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The DRY Principle (Shared Logic)
 */

import { CommandResponse } from './ICommand';
import { IStructuredCommand, CommandCapability } from './IStructuredCommand';
import { ProcessContext } from '../entities/ProcessContext';
import { TerminalState } from '../entities/TerminalState';

export abstract class CommandBase implements IStructuredCommand {
    /**
     * Protocol Requirements
     */
    public abstract readonly capabilities: CommandCapability[];
    public abstract readonly utility: string;

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
     * Protocol: Build arguments programmatically.
     * Default implementation handles basic flags and a single path.
     */
    public buildArgs(requirements: Record<string, any>): string[] {
        const args: string[] = [];
        if (requirements.flags) args.push(...requirements.flags);
        if (requirements.path) args.push(requirements.path);
        return args;
    }

    /**
     * Parses flags (starting with -) and operands.
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

            if (arg.startsWith('--')) {
                const optName = arg.substring(2);
                let found = false;
                for (const def of optionDefinitions) {
                    if (optName === def) {
                        if (i + 1 < args.length) {
                            this.options.set(def, args[++i]);
                            found = true;
                            break;
                        }
                    }
                }
                if (!found) {
                    this.operands.push(arg);
                }
            } else if (arg.startsWith('-') && arg !== '-') {
                const flagStr = arg.substring(1);

                let handled = false;
                for (const def of optionDefinitions) {
                    if (flagStr === def) {
                        if (i + 1 < args.length) {
                            this.options.set(def, args[++i]);
                            handled = true;
                            break;
                        }
                    } else if (flagStr.startsWith(def)) {
                        this.options.set(def, flagStr.substring(def.length));
                        handled = true;
                        break;
                    }
                }

                if (!handled) {
                    for (const char of flagStr) {
                        this.flags.add(char);
                    }
                }
            } else {
                this.operands.push(arg);
            }
        }
    }

    protected hasFlag(char: string): boolean {
        return this.flags.has(char);
    }
}