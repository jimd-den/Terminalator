/**
 * SchemeCommand - Interface Adapter Layer
 * 
 * Implements the 'scheme' command for the terminal.
 * Supports both REPL (interactive) and script execution.
 * 
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture)
 * 
 * Intent:
 * Connects the user's terminal input to the Scheme engine.
 * Manages the global environment and persists bindings between calls.
 */

import { ICommand } from '../../../domain/commands/ICommand';

import { CommandResponse } from '../../../domain/usecases/ExecuteCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { SchemeParser } from '../../../domain/usecases/SchemeParser';
import { SchemeEvaluator } from '../../../domain/usecases/SchemeEvaluator';
import { Environment } from '../../../domain/entities/Environment';
import { ProcedureRegistry } from '../../../domain/entities/ProcedureRegistry';
import { schemeToString, makeProcedure } from '../../../domain/entities/SchemeValue';
import { registerStandardLibrary, getPrelude } from '../../scheme/StandardLibrary';

export class SchemeCommand implements ICommand {
    readonly name = 'scheme';
    readonly description = 'Scheme Lisp interpreter (R7RS-ready)';

    private parser = new SchemeParser();
    private evaluator = new SchemeEvaluator();
    private globalEnv: Environment | null = null;

    constructor(private fs: FileSystemService) {
        // Register built-ins once
        registerStandardLibrary();
    }

    private getEnv(): Environment {
        if (!this.globalEnv) {
            this.globalEnv = new Environment();
            ProcedureRegistry.getInstance().populate(this.globalEnv);

            // Load Prelude (Base Library)
            const prelude = getPrelude();
            const exprs = this.parser.parse(prelude);
            for (const expr of exprs) {
                this.evaluator.evaluate(expr, this.globalEnv);
            }

            // Define 'load' primitive directly in this environment
            const loadProc = makeProcedure({
                name: 'load',
                isBuiltin: true,
                call: (args) => {
                    if (args.length !== 1 || args[0].type !== 'string') {
                        throw new Error("load: expects a single string argument (filename)");
                    }
                    const filename = args[0].value as string;
                    if (!this.fs) throw new Error("load: Filesystem not available");

                    try {
                        // Use process CWD if possible? 
                        // Technically SchemeCommand instance doesn't track CWD per call in `getEnv`.
                        // But we can try to resolve relative to root or handle it dynamically.
                        // For now, let's assume absolute paths or relative to root.
                        const content = this.fs.readFile(filename, '/');
                        const expressions = this.parser.parse(content);
                        let lastResult: any = { type: 'boolean', value: false };
                        for (const expr of expressions) {
                            lastResult = this.evaluator.evaluate(expr, this.globalEnv!);
                        }
                        return lastResult;
                    } catch (e: any) {
                        throw new Error(`load: failed to load '${filename}': ${e.message}`);
                    }
                }
            });
            this.globalEnv.define('load', loadProc);
        }
        return this.globalEnv;
    }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        const env = this.getEnv();
        const fs = this.fs;

        let exprCode = '';
        let filename = '';

        if (args[0] === '-e' && args.length > 1) {
            exprCode = args.slice(1).join(' ');
        } else if (args.length > 0 && args[0].startsWith('(')) {
            // Fallback for direct expression passing: scheme "(+ 1 2)"
            exprCode = args.join(' ');
        } else if (args.length === 1) {
            filename = args[0];
        } else {
            return {
                output: 'MAINFRAME SCHEME v1.0\nUsage: scheme <file.scm> or scheme -e "(expr)"',
                newState: state,
                exitCode: 0
            };
        }

        if (filename) {
            try {
                // Resolve path using context.cwd
                const content = fs.readFile(filename, state.currentDirectory);
                const expressions = this.parser.parse(content);
                let lastResult = '';
                
                const startTime = Date.now();
                let totalInstructions = 0;

                for (const expr of expressions) {
                    const result = this.evaluator.evaluate(expr, env);
                    lastResult = schemeToString(result);
                    totalInstructions += this.evaluator.lastInstructionCount;
                }
                
                const endTime = Date.now();

                return { 
                    output: lastResult, 
                    newState: state, 
                    exitCode: 0,
                    executionStats: {
                        timeMs: endTime - startTime,
                        iterations: totalInstructions,
                        memoryUsed: 0 // Not tracked yet
                    }
                };
            } catch (err: any) {
                return { output: `scheme error: ${err.message}`, newState: state, exitCode: 1 };
            }
        }

        if (exprCode) {
            try {
                const expressions = this.parser.parse(exprCode);
                if (expressions.length === 0) return { output: '', newState: state, exitCode: 0 };

                const startTime = Date.now();
                const result = this.evaluator.evaluate(expressions[0], env);
                const endTime = Date.now();

                return { 
                    output: schemeToString(result), 
                    newState: state, 
                    exitCode: 0,
                    executionStats: {
                        timeMs: endTime - startTime,
                        iterations: this.evaluator.lastInstructionCount,
                        memoryUsed: 0
                    }
                };
            } catch (err: any) {
                return { output: `scheme error: ${err.message}`, newState: state, exitCode: 1 };
            }
        }

        return { output: '', newState: state, exitCode: 0 };
    }
}
