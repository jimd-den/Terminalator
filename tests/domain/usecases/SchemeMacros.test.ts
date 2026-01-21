import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';
import { SchemeParser } from '../../../src/domain/usecases/SchemeParser';
import { SchemeEvaluator } from '../../../src/domain/usecases/SchemeEvaluator';
import { Environment } from '../../../src/domain/entities/Environment';
import { ProcedureRegistry } from '../../../src/domain/entities/ProcedureRegistry';
import { registerStandardLibrary, getPrelude } from '../../../src/interface-adapters/scheme/StandardLibrary';

describe('Scheme Engine - Phase 5: Macros (syntax-rules)', () => {
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
        // Load prelude if necessary, though macros are usually core syntax
        evalStr(getPrelude());
    });

    it('1. should support basic parsing of define-syntax', () => {
        // Just defining it shouldn't crash
        evalStr(`
            (define-syntax nil!
                (syntax-rules ()
                    ((_) (quote '()))))
        `);
        // No assertion needed if it doesn't throw, but let's check if it exists in env (conceptually)
        // Note: Macros might live in a separate registry or special env slot.
    });

    it('2. should expand a simple macro (no arguments)', () => {
        evalStr(`
            (define-syntax return-ten
                (syntax-rules ()
                    ((_) 10)))
        `);
        const res = evalStr('(return-ten)');
        assert.strictEqual(res.value, 10);
    });

    it('3. should expand a macro with arguments', () => {
        evalStr(`
            (define-syntax when
                (syntax-rules ()
                    ((when test stmt)
                     (if test stmt '()))))
        `);

        const res1 = evalStr('(when #t 42)');
        assert.strictEqual(res1.value, 42);

        const res2 = evalStr('(when #f 42)');
        assert.strictEqual(res2.type, 'null'); // '()
    });

    it('4. should interact with function definitions', () => {
        // TCO check with macros?
        evalStr(`
            (define-syntax inc
                (syntax-rules ()
                    ((inc x) (+ x 1))))
        `);
        assert.strictEqual(evalStr('(inc 5)').value, 6);
    });
});
