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
import { SchemeDesugarer } from './SchemeDesugarer';

export class SchemeEvaluator {
    private compiler: SchemeCompiler;
    private macroExpander: MacroExpander;
    private desugarer: SchemeDesugarer;
    public lastInstructionCount: number = 0;

    constructor() {
        this.compiler = new SchemeCompiler();
        this.macroExpander = new MacroExpander();
        this.desugarer = new SchemeDesugarer();
    }

    /**
     * Evaluates an expression in the given environment.
     * Compiles to bytecode and executes on the VM.
     */
    evaluate(expr: SchemeValue, env: Environment): SchemeValue {
        // 1. Expand user macros
        const expanded = this.macroExpander.expand(expr);

        // 2. Rewrite derived forms (let, cond, do, quasiquote...) into core
        //    forms, so the compiler only ever sees the R7RS primitives.
        const core = this.desugarer.desugar(expanded);

        // 3. Compile
        const code = this.compiler.compile(core);

        // 4. Execute
        const vm = new SchemeVM(env);
        const result = vm.execute(code);
        this.lastInstructionCount = vm.getInstructionCount();
        return result;
    }
}
