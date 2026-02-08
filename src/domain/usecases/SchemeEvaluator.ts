/**
 * SchemeEvaluator - Use Case Layer
 * 
 * The evaluation engine for Scheme expressions.
 * Now powered by a Bytecode Compiler and Virtual Machine.
 * 
 * Pillar: THE SHADOW’S VEIL (Encapsulation)
 * Pillar: THE MASTER’S TOOL (VM & Compiler Patterns)
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * 
 * Intent:
 * Orchestrates the compilation and execution of Scheme code.
 * Ensures strict R7RS compliance for tail recursion and continuations.
 */

import { SchemeValue } from '../entities/SchemeValue';
import { Environment } from '../entities/Environment';
import { SchemeCompiler } from './SchemeCompiler';
import { SchemeVM } from './SchemeVM';
import { MacroExpander } from '../services/scheme/MacroExpander';

export class SchemeEvaluator {
    private compiler: SchemeCompiler;
    private macroExpander: MacroExpander;
    public lastInstructionCount: number = 0;

    constructor() {
        this.compiler = new SchemeCompiler();
        this.macroExpander = new MacroExpander();
    }

    /**
     * Evaluates an expression in the given environment.
     * Compiles to bytecode and executes on the VM.
     */
    evaluate(expr: SchemeValue, env: Environment): SchemeValue {
        // 1. Expand Macros
        const expanded = this.macroExpander.expand(expr);

        // 2. Compile
        const code = this.compiler.compile(expanded);

        // 3. Execute
        const vm = new SchemeVM(env);
        const result = vm.execute(code);
        this.lastInstructionCount = vm.getInstructionCount();
        return result;
    }
}
