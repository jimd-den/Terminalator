import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';
import { SchemeParser } from '../../../src/domain/usecases/SchemeParser';
import { SchemeEvaluator } from '../../../src/domain/usecases/SchemeEvaluator';
import { Environment } from '../../../src/domain/entities/Environment';
import { ProcedureRegistry } from '../../../src/domain/entities/ProcedureRegistry';
import { registerStandardLibrary, getPrelude } from '../../../src/interface-adapters/scheme/StandardLibrary';

describe('Scheme Engine - Phase 4: Standard Library', () => {
    const parser = new SchemeParser();
    const evaluator = new SchemeEvaluator();
    let globalEnv: Environment;

    const evalStr = (s: string) => {
        const exprs = parser.parse(s);
        let res: any;
        for (const expr of exprs) {
            res = evaluator.evaluate(expr, globalEnv);
        }
        return res;
    };

    beforeEach(() => {
        globalEnv = new Environment();
        const registry = ProcedureRegistry.getInstance();
        registry.clear();
        registerStandardLibrary();
        registry.populate(globalEnv);

        // Evaluate prelude
        const prelude = getPrelude();
        evalStr(prelude);
    });

    describe('Numeric Operations', () => {
        it('1. should support abs, max, min', () => {
            assert.strictEqual(evalStr('(abs -42)').value, 42);
            assert.strictEqual(evalStr('(max 1 5 3)').value, 5);
            assert.strictEqual(evalStr('(min 1 5 3)').value, 1);
        });

        it('2. should support modulo, quotient, remainder', () => {
            assert.strictEqual(evalStr('(modulo 13 4)').value, 1);
            assert.strictEqual(evalStr('(quotient 13 4)').value, 3);
            assert.strictEqual(evalStr('(remainder 13 4)').value, 1);
        });
    });

    describe('Higher-Order Functions & Apply', () => {
        it('3. should support apply', () => {
            assert.strictEqual(evalStr('(apply + (list 1 2 3))').value, 6);
        });

        it('4. should support map', () => {
            // (map + '(1 2 3) '(10 20 30)) => (11 22 33)
            const res: any = evalStr("(map (lambda (x) (* x 2)) '(1 2 3))");
            assert.strictEqual(res.value.car.value, 2);
            assert.strictEqual(res.value.cdr.value.car.value, 4);
        });

        it('5. should support for-each', () => {
            // for-each returns undefined (or unspecified), performs side effects
            evalStr('(define total 0)');
            evalStr("(for-each (lambda (x) (set! total (+ total x))) '(1 2 3))");
            assert.strictEqual(globalEnv.lookup('total').value, 6);
        });
    });

    describe('List Manipulation', () => {
        it('6. should support length, append, reverse', () => {
            assert.strictEqual(evalStr("(length '(1 2 3))").value, 3);

            const appendRes: any = evalStr("(append '(a) '(b c))"); // (a b c)
            assert.strictEqual(appendRes.value.car.value, 'a');
            assert.strictEqual(appendRes.value.cdr.value.car.value, 'b');

            const reverseRes: any = evalStr("(reverse '(1 2 3))"); // (3 2 1)
            assert.strictEqual(reverseRes.value.car.value, 3);
        });

        it('7. should support list-ref, list-tail', () => {
            assert.strictEqual(evalStr("(list-ref '(a b c) 1)").value, 'b');
        });
    });
});
