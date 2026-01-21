import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';
import { SchemeParser } from '../../../src/domain/usecases/SchemeParser';
import { SchemeEvaluator } from '../../../src/domain/usecases/SchemeEvaluator';
import { Environment } from '../../../src/domain/entities/Environment';
import { ProcedureRegistry } from '../../../src/domain/entities/ProcedureRegistry';
import { registerStandardLibrary } from '../../../src/interface-adapters/scheme/StandardLibrary';

describe('Scheme Engine - Phase 3: call/cc & Control', () => {
    const parser = new SchemeParser();
    const evaluator = new SchemeEvaluator();
    let globalEnv: Environment;

    beforeEach(() => {
        globalEnv = new Environment();
        const registry = ProcedureRegistry.getInstance();
        registry.clear();
        registerStandardLibrary();

        // Add call/cc to the environment?
        // In this implementation, call/cc is a primitive that we'll handle.
        registry.register('call/cc', (args) => {
            // This is a placeholder since the VM handles it, OR we can implement it here
            // if we give the primitive access to the VM. 
            // For now, let's see if we can trigger it.
            throw new Error('call/cc must be handled by the VM');
        });

        registry.populate(globalEnv);
    });

    const evalStr = (s: string) => {
        const exprs = parser.parse(s);
        return evaluator.evaluate(exprs[0], globalEnv);
    };

    describe('call-with-current-continuation (call/cc)', () => {
        it('1. should return a value normally', () => {
            assert.strictEqual(evalStr('(call/cc (lambda (k) 42))').value, 42);
        });

        it('2. should exit early when continuation is called', () => {
            assert.strictEqual(evalStr('(call/cc (lambda (k) (k 10) 20))').value, 10);
        });

        it('3. should work with non-local exits', () => {
            evalStr(`
                (define test
                    (lambda (k)
                        (k "shortcut")))
            `);
            assert.strictEqual(evalStr('(call/cc test)').value, 'shortcut');
        });

        it('4. should be able to resume a continuation multiple times', () => {
            evalStr(`
                (define cont #f)
                (define count 0)
                (define res (call/cc (lambda (k) (set! cont k) 100)))
             `);
            // This is a bit complex for a single evalStr. 
            // Need to manage state between calls.
        });
    });
});
