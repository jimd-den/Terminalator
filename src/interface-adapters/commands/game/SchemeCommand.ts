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

import { ICommand } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { CommandResponse } from '../../../domain/usecases/ExecuteCommand';
import { TerminalState } from '../../../domain/entities/TerminalState';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { SchemeParser } from '../../../domain/usecases/SchemeParser';
import { SchemeEvaluator } from '../../../domain/usecases/SchemeEvaluator';
import { Environment } from '../../../domain/entities/Environment';
import { ProcedureRegistry } from '../../../domain/entities/ProcedureRegistry';
import { schemeToString } from '../../../domain/entities/SchemeValue';
import { registerStandardLibrary, getPrelude } from '../../scheme/StandardLibrary';

export class SchemeCommand implements ICommand {
    readonly name = 'scheme';
    readonly description = 'Scheme Lisp interpreter (R7RS-ready)';

    private parser = new SchemeParser();
    private evaluator = new SchemeEvaluator();
    private globalEnv: Environment | null = null;

    constructor(private fs: FileSystem) {
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
        }
        return this.globalEnv;
    }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const env = this.getEnv();
        const fs = context.fs;

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
                const content = fs.readFile(filename, context.cwd);
                const expressions = this.parser.parse(content);
                let lastResult = '';
                for (const expr of expressions) {
                    const result = this.evaluator.evaluate(expr, env);
                    lastResult = schemeToString(result);
                }
                return { output: lastResult, newState: state, exitCode: 0 };
            } catch (err: any) {
                return { output: `scheme error: ${err.message}`, newState: state, exitCode: 1 };
            }
        }

        if (exprCode) {
            try {
                const expressions = this.parser.parse(exprCode);
                if (expressions.length === 0) return { output: '', newState: state, exitCode: 0 };

                const result = this.evaluator.evaluate(expressions[0], env);
                return { output: schemeToString(result), newState: state, exitCode: 0 };
            } catch (err: any) {
                return { output: `scheme error: ${err.message}`, newState: state, exitCode: 1 };
            }
        }

        return { output: '', newState: state, exitCode: 0 };
    }
}
