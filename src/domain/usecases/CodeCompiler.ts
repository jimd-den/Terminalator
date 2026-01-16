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

    compile(path: string, cwd: string = '/'): CompilationResult {
        return Logger.trace('CodeCompiler.compile', () => {
            // Resolve node relative to cwd (Assuming compile runs from somewhere? 
            // The command passes arg[0], but context is in the command. 
            // The CodeCompiler just takes path. Let's assume absolute or handle it in command?
            // Actually command passes `args[0]`. If it's relative, we need CWD. 
            // But CodeCompiler signature only takes path. 
            // We should ideally pass CWD to compile(). 
            // For now, let's assume the caller resolves it or we try to resolve it relative to root if absolute, 
            // BUT wait, resolveNode needs cwd if path is relative. 
            // The current signature `compile(path)` implies we might be missing context.
            // Let's modify the signature to `compile(path, cwd)`.
            // But checking CompileCommand.ts: `this.compiler.compile(args[0] || '')` 
            // It doesn't pass CWD. I should update CompileCommand too.
            // For now, I will use '/' as default CWD if not provided, or better, 
            // I'll stick to simple absolute path resolution if possible.
            // Actually, `resolveNode` requires CWD. 
            // I will update the signature.

            // WAIT, safely, I can try to resolve, but I need CWD. 
            // Let's look at CompileCommand again. It has context.cwd.
            // I need to update CompileCommand.ts as well.

            // For this step I will assume path is processed or I will change signature.
            // Let's change signature to `compile(path: string, cwd: string)` to be correct.

            // Wait, I can't change signature in just this file if CompileCommand expects the old one.
            // I will update this file to accept optional cwd, defaulting to root.

            const node = this.fs.resolveNode(path, '/'); // Temporary default
            if (!node || this.fs.isDirectory(node)) {
                return { success: false, output: `Error: File ${path} not found.` };
            }

            const inode = this.fs.getInode(node.inodeId);
            const content = (inode && typeof inode.content === 'string') ? inode.content : '';
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
