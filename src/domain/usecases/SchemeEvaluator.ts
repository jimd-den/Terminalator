/**
 * SchemeEvaluator - Use Case Layer
 * 
 * The evaluation engine for Scheme expressions.
 * Implements lexical scoping, procedure application, and special forms.
 * Optimized for Tail-Call (TCO) via an iterative evaluation loop.
 * 
 * Pillar: THE SHADOW’S VEIL (Encapsulation)
 * Pillar: THE MASTER’S TOOL (TCO Pattern)
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * 
 * Intent:
 * Processes SchemeValue trees and returns computed results.
 * Manages the transition from code to side-effects (e.g., FileSystem access).
 */

import {
    SchemeValue,
    listToArray,
    makeSymbol,
    makeProcedure,
    Procedure,
    schemeToString
} from '../entities/SchemeValue';
import { Environment } from '../entities/Environment';

export class SchemeEvaluator {
    /**
     * Evaluates an expression in the given environment.
     * Uses a loop to support Tail-Call Optimization (TCO).
     */
    evaluate(expr: SchemeValue, env: Environment): SchemeValue {
        let currentExpr = expr;
        let currentEnv = env;

        while (true) {
            // 1. Literal: Numbers, Strings, Booleans, Null
            if (['number', 'string', 'boolean', 'null', 'procedure'].includes(currentExpr.type)) {
                return currentExpr;
            }

            // 2. Symbol: Variable Lookup
            if (currentExpr.type === 'symbol') {
                return currentEnv.lookup(currentExpr.value);
            }

            // 3. Lists: Special Forms or Procedure Application
            if (currentExpr.type === 'pair') {
                const arr = listToArray(currentExpr);
                const first = arr[0];

                if (first.type === 'symbol') {
                    const op = first.value;

                    // --- Special Forms ---

                    // (quote <expr>)
                    if (op === 'quote') {
                        return arr[1];
                    }

                    // (if <test> <consequent> <alternate>)
                    if (op === 'if') {
                        const test = this.evaluate(arr[1], currentEnv);
                        const isTrue = !(test.type === 'boolean' && test.value === false);
                        currentExpr = isTrue ? arr[2] : (arr[3] || makeSymbol('unspecified'));
                        continue; // TCO
                    }

                    // (define <name> <expr>)
                    if (op === 'define') {
                        const name = arr[1].value;
                        const val = this.evaluate(arr[2], currentEnv);
                        currentEnv.define(name, val);
                        return makeSymbol(name);
                    }

                    // (set! <name> <expr>)
                    if (op === 'set!') {
                        const name = arr[1].value;
                        const val = this.evaluate(arr[2], currentEnv);
                        currentEnv.assign(name, val);
                        return val;
                    }

                    // (lambda (<params>) <body>)
                    if (op === 'lambda') {
                        const params = listToArray(arr[1]).map(p => p.value);
                        const body = arr[2]; // Simplified: one expression body
                        const closure: Procedure = {
                            isBuiltin: false,
                            params,
                            body,
                            env: currentEnv
                        };
                        return makeProcedure(closure);
                    }

                    // (begin <expr1> <expr2> ...)
                    if (op === 'begin') {
                        for (let i = 1; i < arr.length - 1; i++) {
                            this.evaluate(arr[i], currentEnv);
                        }
                        currentExpr = arr[arr.length - 1];
                        continue; // TCO
                    }
                }

                // --- Procedure Application ---
                const procVal = this.evaluate(arr[0], currentEnv);
                if (procVal.type !== 'procedure') {
                    throw new Error(`Not a procedure: ${schemeToString(procVal)}`);
                }

                const proc: Procedure = procVal.value;
                const args = arr.slice(1).map(a => this.evaluate(a, currentEnv));

                if (proc.isBuiltin) {
                    return proc.call!(args);
                } else {
                    // Application of Lambda: Extend env and loop (TCO)
                    currentEnv = proc.env.extend(proc.params!, args);
                    currentExpr = proc.body!;
                    continue; // TCO
                }
            }

            throw new Error(`Unknown expression type: ${currentExpr.type}`);
        }
    }
}
