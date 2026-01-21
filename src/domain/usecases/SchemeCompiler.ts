/**
 * SchemeCompiler - Domain Use Case Layer
 * 
 * Compiles Scheme S-expressions into bytecode instructions for implementation
 * on the SchemeVM.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture)
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * 
 * Intent:
 * Bridges the gap between high-level S-expression trees and low-level VM
 * instructions. Implements Tail-Call Optimization (TCO) during the compilation
 * phase to ensure R7RS compliance.
 */

import { SchemeValue, listToArray } from '../entities/SchemeValue';
import { Instruction } from './SchemeVM';

export class SchemeCompiler {
    /**
     * Compiles an expression. 
     * @param isTail If true, the current expression is in a tail position.
     */
    compile(expr: SchemeValue, isTail: boolean = false): Instruction[] {
        // 1. Literal Cases
        if (['number', 'string', 'boolean', 'char', 'null', 'vector', 'bytevector'].includes(expr.type)) {
            return [{ op: 'CONST', value: expr } as Instruction, ...(isTail ? [{ op: 'RETURN' } as Instruction] : [])];
        }

        // 2. Variable Lookup
        if (expr.type === 'symbol') {
            if (expr.value === '#<void>') {
                return [{ op: 'CONST', value: { type: 'symbol', value: '#<void>' } } as Instruction, ...(isTail ? [{ op: 'RETURN' } as Instruction] : [])];
            }
            return [{ op: 'LOOKUP', name: expr.value } as Instruction, ...(isTail ? [{ op: 'RETURN' } as Instruction] : [])];
        }

        // 3. List Structures (Special Forms or Applications)
        if (expr.type === 'pair') {
            const arr = listToArray(expr);
            const first = arr[0];

            if (first.type === 'symbol') {
                const op = first.value;

                if (op === 'quote') return this.compileQuote(arr, isTail);
                if (op === 'define') return this.compileDefine(arr, isTail);
                if (op === 'set!') return this.compileSet(arr, isTail);
                if (op === 'if') return this.compileIf(arr, isTail);
                if (op === 'lambda') return this.compileLambda(arr, isTail);
                if (op === 'begin') return this.compileBegin(arr, isTail);
                if (op === 'call/cc' || op === 'call-with-current-continuation') return this.compileCallCC(arr, isTail);
            }

            // Procedure Application
            return this.compileApplication(arr, isTail);
        }

        throw new Error(`Cannot compile expression of type: ${expr.type}`);
    }

    private compileQuote(arr: SchemeValue[], isTail: boolean): Instruction[] {
        return [{ op: 'CONST', value: arr[1] } as Instruction, ...(isTail ? [{ op: 'RETURN' } as Instruction] : [])];
    }

    private compileDefine(arr: SchemeValue[], isTail: boolean): Instruction[] {
        const head = arr[1];

        if (head.type === 'pair') {
            // Shorthand: (define (name args...) body...)
            const name = (head.value.car as any).value;
            const args = head.value.cdr; // List of args

            // Construct lambda: (lambda (args...) body...)
            // Lambda expects: [symbol("lambda"), args, body...]
            // But compileLambda takes the whole array starting with lambda.
            // We can reuse compileLambda if we construct the array properly.
            // Use SchemeValue structure construction to be safe or duplicate logic.
            // Simpler: Duplicate Logic for closure creation to avoid object construction overhead.

            const params = listToArray(args).map(p => (p as any).value);
            const bodyExprs = arr.slice(2);
            const bodyCode: Instruction[] = [];
            for (let i = 0; i < bodyExprs.length; i++) {
                bodyCode.push(...this.compile(bodyExprs[i], i === bodyExprs.length - 1));
            }
            const closure: Instruction = { op: 'CLOSURE', params, body: bodyCode };

            // Now Define name = closure
            return [closure, { op: 'DEFINE', name } as Instruction, ...(isTail ? [{ op: 'RETURN' } as Instruction] : [])];
        }

        const name = (arr[1] as any).value;
        const valInstructions = this.compile(arr[2], false);
        return [...valInstructions, { op: 'DEFINE', name } as Instruction, ...(isTail ? [{ op: 'RETURN' } as Instruction] : [])];
    }

    private compileSet(arr: SchemeValue[], isTail: boolean): Instruction[] {
        const name = (arr[1] as any).value;
        const valInstructions = this.compile(arr[2], false);
        return [...valInstructions, { op: 'SET', name } as Instruction, ...(isTail ? [{ op: 'RETURN' } as Instruction] : [])];
    }

    private compileIf(arr: SchemeValue[], isTail: boolean): Instruction[] {
        const test = this.compile(arr[1], false);
        const thenBranch = this.compile(arr[2], isTail);
        const elseBranch = arr[3] ? this.compile(arr[3], isTail) : [{ op: 'CONST', value: { type: 'symbol', value: 'unspecified' } } as Instruction];

        if (isTail) {
            return [
                ...test,
                { op: 'JUMP_IF_FALSE', offset: thenBranch.length + 1 } as Instruction,
                ...thenBranch,
                ...elseBranch
            ];
        } else {
            return [
                ...test,
                { op: 'JUMP_IF_FALSE', offset: thenBranch.length + 2 } as Instruction,
                ...thenBranch,
                { op: 'JUMP', offset: elseBranch.length + 1 } as Instruction,
                ...elseBranch
            ];
        }
    }

    private compileLambda(arr: SchemeValue[], isTail: boolean): Instruction[] {
        const params = listToArray(arr[1]).map(p => (p as any).value);
        const bodyExprs = arr.slice(2);
        const bodyCode: Instruction[] = [];
        for (let i = 0; i < bodyExprs.length; i++) {
            bodyCode.push(...this.compile(bodyExprs[i], i === bodyExprs.length - 1));
        }

        const closure: Instruction = { op: 'CLOSURE', params, body: bodyCode };
        return [closure, ...(isTail ? [{ op: 'RETURN' } as Instruction] : [])];
    }

    private compileBegin(arr: SchemeValue[], isTail: boolean): Instruction[] {
        const instrs: Instruction[] = [];
        const exprs = arr.slice(1);
        for (let i = 0; i < exprs.length; i++) {
            instrs.push(...this.compile(exprs[i], isTail && (i === exprs.length - 1)));
        }
        return instrs;
    }

    private compileCallCC(arr: SchemeValue[], isTail: boolean): Instruction[] {
        const receiver = this.compile(arr[1], false);
        return [
            ...receiver,
            { op: 'CALL_CC' } as Instruction,
            { op: 'APPLY', argCount: 1 } as Instruction,
            ...(isTail ? [{ op: 'RETURN' } as Instruction] : [])
        ];
    }

    private compileApplication(arr: SchemeValue[], isTail: boolean): Instruction[] {
        const instrs: Instruction[] = [];
        // Push arguments
        for (let i = 1; i < arr.length; i++) {
            instrs.push(...this.compile(arr[i], false));
        }
        // Push procedure
        instrs.push(...this.compile(arr[0], false));

        // APPLY
        instrs.push({ op: 'APPLY', argCount: arr.length - 1 } as Instruction);

        if (isTail) {
            instrs.push({ op: 'RETURN' } as Instruction);
        }

        return instrs;
    }
}
