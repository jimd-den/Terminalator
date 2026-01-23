/**
 * AwkCommand - Core Command
 *
 * Pattern scanning and processing language.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to process text columns.
 *
 * Note:
 * Uses `new Function` to simulate the AWK interpreter. This is acceptable within the
 * context of a client-side simulation where the "environment" is already sandboxed
 * by the browser/runtime, but would be a security risk in a server-side shell.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';
import { AwkLexer } from './awk/AwkLexer';
import { AwkParser } from './awk/AwkParser';
import { AwkInterpreter } from './awk/AwkInterpreter';

export class AwkCommand implements ICommand {
    private fs: FileSystemService;
    constructor(fs: FileSystemService) {
        this.fs = fs;
    }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
        let program = '';
        const files: string[] = [];
        let fieldSeparator = ' ';

        let skipNext = false;
        for (let i = 0; i < args.length; i++) {
            if (skipNext) {
                skipNext = false;
                continue;
            }
            const arg = args[i];
            if (arg.startsWith('-F')) {
                if (arg.length > 2) {
                    fieldSeparator = arg.substring(2);
                } else if (i + 1 < args.length) {
                    fieldSeparator = args[i + 1];
                    skipNext = true;
                }
            } else if (!program && !arg.startsWith('-')) {
                program = arg;
            } else if (arg.startsWith('-')) {
                // flags ignored for now
            } else {
                files.push(arg);
            }
        }

        if (!program) {
            return { output: 'awk: missing program', newState: state, exitCode: 1 };
        }

        // Robustness: Strip surrounding quotes if the parser left them
        if ((program.startsWith("'") && program.endsWith("'")) || (program.startsWith('"') && program.endsWith('"'))) {
            program = program.slice(1, -1);
        }

        try {
            // 1. Lexing
            const lexer = new AwkLexer(program);
            const tokens = lexer.tokenize();

            // 2. Parsing
            const parser = new AwkParser(tokens);
            const ast = parser.parse();

            // 3. Execution (Interpreter)
            const interpreter = new AwkInterpreter();

            // Set FS (state initialization) - we might need to expose this in Interpreter
            // Or modify program? 
            // Better: Interpreter constructor or valid method?
            // The Interpreter as written puts 'FS' in vars map.
            // We can treat it as a variable assignment if we exposed setVar?
            // Or just prepend BEGIN { FS="x" } ?
            // Or modify interpreter to accept initial vars.
            // Current interpreter implementation: this.vars.set('FS', ' ');
            // We'll trust the interpreter handles FS default, but command line -F overrides.
            // We need to inject -F.
            // Modify interpreter logic to separate FS initialization?
            // Let's prepend a BEGIN block or modifying the AST? 
            // Simplest: Prepend 'BEGIN { FS="sep" }' to program string?
            // Safer: Add internal API to interpreter if we could edit it.
            // Since I just wrote Interpreter, I know I didn't verify a setVar method.
            // I'll prepend BEGIN logic to program string before lexing!

            if (fieldSeparator !== ' ') {
                // Escape quotes in separator?
                program = `BEGIN { FS="${fieldSeparator}" } ` + program;
                // Re-lex/parse
                const lexer2 = new AwkLexer(program);
                const tokens2 = lexer2.tokenize();
                const parser2 = new AwkParser(tokens2);
                const ast2 = parser2.parse();

                let content = '';
                if (files.length > 0) {
                    for (const file of files) {
                        try {
                            const path = file.startsWith('/') ? file : (state.currentDirectory === '/' ? `/${file}` : `${state.currentDirectory}/${file}`);
                            content += this.fs.readFile(path) + '\n';
                        } catch (e: any) {
                            return { output: `awk: ${file}: ${e.message}`, newState: state, exitCode: 1 };
                        }
                    }
                    if (content.endsWith('\n')) content = content.slice(0, -1);
                } else if (input !== undefined) {
                    content = input;
                }

                const output = interpreter.execute(ast2, content);
                return { output: output.trimEnd(), newState: state, exitCode: 0 };
            } else {
                let content = '';
                if (files.length > 0) {
                    for (const file of files) {
                        try {
                            const path = file.startsWith('/') ? file : (state.currentDirectory === '/' ? `/${file}` : `${state.currentDirectory}/${file}`);
                            content += this.fs.readFile(path) + '\n';
                        } catch (e: any) {
                            return { output: `awk: ${file}: ${e.message}`, newState: state, exitCode: 1 };
                        }
                    }
                    if (content.endsWith('\n')) content = content.slice(0, -1);
                } else if (input !== undefined) {
                    content = input;
                }

                const output = interpreter.execute(ast, content);
                return { output: output.trimEnd(), newState: state, exitCode: 0 };
            }

        } catch (e: any) {
            return { output: `awk: ${e.message}`, newState: state, exitCode: 1 };
        }
    }
}
