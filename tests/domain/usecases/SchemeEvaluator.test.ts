import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';
import { SchemeParser } from '../../../src/domain/usecases/SchemeParser';
import { SchemeEvaluator } from '../../../src/domain/usecases/SchemeEvaluator';
import { Environment } from '../../../src/domain/entities/Environment';
import { schemeToString } from '../../../src/domain/entities/SchemeValue';
import { ProcedureRegistry } from '../../../src/domain/entities/ProcedureRegistry';
import { registerStandardLibrary } from '../../../src/interface-adapters/scheme/StandardLibrary';

describe('Scheme Engine - Phase 2: Evaluator & Environments', () => {
    const parser = new SchemeParser();
    const evaluator = new SchemeEvaluator();
    let globalEnv: Environment;

    beforeEach(() => {
        globalEnv = new Environment();
        // For now, using the existing registry
        const registry = ProcedureRegistry.getInstance();
        registry.clear();
        registerStandardLibrary();
        registry.populate(globalEnv);
    });

    const evalStr = (s: string) => {
        const exprs = parser.parse(s);
        return evaluator.evaluate(exprs[0], globalEnv);
    };

    describe('Basic Evaluation', () => {
        it('1. should evaluate literals', () => {
            assert.strictEqual(evalStr('42').value, 42);
            assert.strictEqual(evalStr('"hello"').value, 'hello');
            assert.strictEqual(evalStr('#t').value, true);
        });

        it('2. should evaluate symbols from env', () => {
            globalEnv.define('x', { type: 'number', value: 10 });
            assert.strictEqual(evalStr('x').value, 10);
        });

        it('3. should handle quote', () => {
            const res = evalStr("'foo");
            assert.strictEqual(res.type, 'symbol');
            assert.strictEqual(res.value, 'foo');
        });
    });

    describe('Special Forms', () => {
        it('4. should handle define', () => {
            evalStr('(define y 20)');
            assert.strictEqual(globalEnv.lookup('y').value, 20);
        });

        it('5. should handle if (basic)', () => {
            assert.strictEqual(evalStr('(if #t 1 2)').value, 1);
            assert.strictEqual(evalStr('(if #f 1 2)').value, 2);
        });

        it('6. should handle if (truthy/falsy)', () => {
            assert.strictEqual(evalStr('(if 0 1 2)').value, 1); // 0 is truthy in Scheme
            assert.strictEqual(evalStr('(if "false" 1 2)').value, 1);
        });

        it('7. should handle set!', () => {
            evalStr('(define z 10)');
            evalStr('(set! z 20)');
            assert.strictEqual(globalEnv.lookup('z').value, 20);
        });

        it('8. should handle begin', () => {
            const res = evalStr('(begin (define a 1) (define b 2) (+ a b))');
            assert.strictEqual(res.value, 3);
        });
    });

    describe('Lambda & Scoping', () => {
        it('9. should handle simple lambda', () => {
            evalStr('(define add1 (lambda (x) (+ x 1)))');
            assert.strictEqual(evalStr('(add1 10)').value, 11);
        });

        it('10. should handle nested closures (lexical scoping)', () => {
            evalStr(`
                (define make-adder 
                    (lambda (x) 
                        (lambda (y) (+ x y))))
            `);
            evalStr('(define add5 (make-adder 5))');
            assert.strictEqual(evalStr('(add5 10)').value, 15);
        });

        it('11. should handle shadowed variables', () => {
            evalStr('(define x 10)');
            assert.strictEqual(evalStr('((lambda (x) x) 20)').value, 20);
            assert.strictEqual(evalStr('x').value, 10);
        });
    });

    describe('Primitives', () => {
        it('12. should handle arithmetic (+, -, *, /)', () => {
            assert.strictEqual(evalStr('(+ 1 2 3)').value, 6);
            assert.strictEqual(evalStr('(- 10 2 3)').value, 5);
            assert.strictEqual(evalStr('(* 2 3 4)').value, 24);
            assert.strictEqual(evalStr('(/ 10 2)').value, 5);
        });

        it('13. should handle comparisons (=, <, >, <=, >=)', () => {
            assert.strictEqual(evalStr('(= 5 5)').value, true);
            assert.strictEqual(evalStr('(< 3 5)').value, true);
            assert.strictEqual(evalStr('(> 5 3)').value, true);
        });

        it('14. should handle list primitives (cons, car, cdr, list, null?)', () => {
            evalStr('(define p (cons 1 2))');
            assert.strictEqual(evalStr('(car p)').value, 1);
            assert.strictEqual(evalStr('(cdr p)').value, 2);
            assert.strictEqual(evalStr('(null? (list))').value, true);
        });
    });

    describe('Recursion (Basic)', () => {
        it('15. should handle recursive factorial', () => {
            evalStr(`
                (define fact
                    (lambda (n)
                        (if (= n 0)
                            1
                            (* n (fact (- n 1))))))
            `);
            assert.strictEqual(evalStr('(fact 5)').value, 120);
        });

        it('16. should handle deep tail-recursion (TCO)', () => {
            // (sum 10000 0) should not blow the stack if TCO is working
            evalStr(`
                (define sum
                    (lambda (n acc)
                        (if (= n 0)
                            acc
                            (sum (- n 1) (+ n acc)))))
            `);
            assert.strictEqual(evalStr('(sum 10000 0)').value, 50005000);
        });
    });
});
