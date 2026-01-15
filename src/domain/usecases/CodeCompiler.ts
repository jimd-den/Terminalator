/**
 * CodeCompiler Use Case - Application Logic Layer
 * 
 * Simulates a compiler for the "Terminalator" system.
 * Checks for "syntax errors" in 24XX scripts and "compiles" them.
 */

import { Logger } from '../../infrastructure/telemetry/Logger';
import { FileSystem } from '../entities/FileSystem';
import { Interpreter } from '../interpreters/Interpreter';
import { LispInterpreter } from '../interpreters/LispInterpreter';

export interface CompilationResult {
    success: boolean;
    output: string;
}

export class CodeCompiler {
    private interpreters: Record<string, Interpreter>;

    constructor(private fs: FileSystem) {
        this.interpreters = {
            'lisp': new LispInterpreter(),
            // Future interpreters (python, js, etc.) can be added here
        };
    }

    compile(path: string): CompilationResult {
        return Logger.trace('CodeCompiler.compile', () => {
            const node = this.fs.getNode(path);
            if (!node || node.type !== 'file') {
                return { success: false, output: `Error: File ${path} not found.` };
            }

            const content = node.content || '';
            const extension = path.split('.').pop()?.toLowerCase();

            if (extension === 'lisp' || extension === 'scm') {
                const interpreter = this.interpreters['lisp'];
                const output = interpreter.evaluate(content);

                if (output.startsWith('LISP ERROR')) {
                    return { success: false, output };
                }

                return {
                    success: true,
                    output: `EXECUTING LISP RUNTIME...\n> ${output}\n\nPROCESS COMPLETED.`
                };
            }

            // Fallback for legacy 24XX scripts (simulated)
            const keywords = ['EXEC', 'RETRIEVE', 'LINK', 'ENCRYPT'];
            const foundKeywords = keywords.filter(k => content.includes(k));

            if (foundKeywords.length > 0) {
                return {
                    success: true,
                    output: `COMPILING ${path}...\nOPTIMIZING CORE LOOP...\nDEPLOYING BINARY...\nSUCCESS: Found protocols: [ ${foundKeywords.join(', ')} ]`
                };
            } else {
                return {
                    success: false,
                    output: `SYNTAX ERROR: No valid 24XX protocols found in "${path}".\nPlease use LISP code (.lisp) or legacy protocols.`
                };
            }
        }, { path });
    }
}
