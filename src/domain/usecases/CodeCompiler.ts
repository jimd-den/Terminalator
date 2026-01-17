/**
 * CodeCompiler Use Case - Application Logic Layer
 * 
 * Simulates a compiler for the "Terminalator" system.
 * Checks for "syntax errors" in 24XX scripts and "compiles" them.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Watchman’s Log (Telemetry)
 */

import { TelemetryPort } from '../ports/TelemetryPort';
import { FileSystem, S_IFREG, S_IFMT } from '../entities/FileSystem';
import { Interpreter } from '../interpreters/Interpreter';
import { LispInterpreter } from '../interpreters/LispInterpreter';

export interface CompilationResult {
    success: boolean;
    output: string;
}

export class CodeCompiler {
    private interpreters: Record<string, Interpreter>;

    constructor(private fs: FileSystem, private telemetry?: TelemetryPort) {
        this.interpreters = {
            'lisp': new LispInterpreter(),
            // Future interpreters (python, js, etc.) can be added here
        };
    }

    compile(path: string): CompilationResult {
        const compileLogic = () => {
            const node = this.fs.resolveNode(path);
            if (!node) {
                return { success: false, output: `Error: File ${path} not found.` };
            }

            const inode = this.fs.getInode(node.inodeId);
            if (!inode || (inode.mode & S_IFMT) !== S_IFREG) {
                return { success: false, output: `Error: ${path} is not a file.` };
            }

            const content = (typeof inode.content === 'string') ? inode.content : '';
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
        };

        if (this.telemetry) {
            return this.telemetry.trace('CodeCompiler.compile', compileLogic, { path });
        }

        return compileLogic();
    }
}
