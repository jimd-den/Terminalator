/**
 * StandardLibrary - Interface Adapter Layer
 * 
 * Orchestrates the registration of Scheme procedures.
 * Bridges Pure Domain Primitives with Host-Specific Procedures (e.g., IO).
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture)
 * Pillar: THE MASTER’S TOOL (Registry Pattern)
 * 
 * Intent:
 * Provides the user with a complete R7RS-compatible base library.
 * Keeps host-specific side effects segregated from the pure evaluator.
 */

import { SchemeValue } from '../../domain/entities/SchemeValue';
import { ProcedureRegistry } from '../../domain/entities/ProcedureRegistry';
import { getPurePrimitives } from '../../domain/usecases/SchemePrimitives';
import { getBaseLibrary } from '../../domain/usecases/SchemeBaseLibrary';

export const registerStandardLibrary = () => {
    const registry = ProcedureRegistry.getInstance();

    // 1. Register Pure Domain Primitives
    //    Base library goes on last so its arity-correct comparison chains
    //    (< 1 2 3) replace the two-argument versions in SchemePrimitives.
    for (const prim of [...getPurePrimitives(), ...getBaseLibrary()]) {
        registry.register(prim.name, prim.func);
    }

    // 2. Register Host-Specific Primitives (Interface Adapters)

    // (display <obj>)
    registry.register('display', (args) => {
        // In the Terminalator, this will eventually pipe to the terminal output buffer.
        // For the evaluator, we return the value to allow nesting if needed.
        return args[0];
    });

    // (newline)
    registry.register('newline', () => {
        return { type: 'symbol', value: 'ok' };
    });

    // (apply <proc> <args>) - Placeholder for VM special handling
    registry.register('apply', (args) => {
        throw new Error("apply: internal error, VM should handle this specially");
    });
};

/**
 * The prelude holds procedures that are clearer written in Scheme than in the
 * host language -- and, for a game that teaches Scheme, ones a curious player
 * can usefully read. Anything needing host access lives in the registry above.
 */
export const getPrelude = (): string => `
(define (map f l)
  (if (null? l)
      '()
      (cons (f (car l)) (map f (cdr l)))))

(define (for-each f l)
  (if (null? l)
      #t
      (begin (f (car l)) (for-each f (cdr l)))))

(define (filter pred l)
  (cond ((null? l) '())
        ((pred (car l)) (cons (car l) (filter pred (cdr l))))
        (else (filter pred (cdr l)))))

(define (fold-left f acc l)
  (if (null? l) acc (fold-left f (f acc (car l)) (cdr l))))

(define (fold-right f acc l)
  (if (null? l) acc (f (car l) (fold-right f acc (cdr l)))))

(define (reduce f acc l)
  (if (null? l) acc (fold-left f (car l) (cdr l))))

(define (list-index pred l)
  (let loop ((l l) (i 0))
    (cond ((null? l) #f)
          ((pred (car l)) i)
          (else (loop (cdr l) (+ i 1))))))

(define (any pred l)
  (cond ((null? l) #f)
        ((pred (car l)) #t)
        (else (any pred (cdr l)))))

(define (every pred l)
  (cond ((null? l) #t)
        ((pred (car l)) (every pred (cdr l)))
        (else #f)))

(define (assoc-ref alist key)
  (let ((hit (assoc key alist)))
    (if hit (cdr hit) #f)))

(define (call-with-values producer consumer)
  (apply consumer (%values->list (producer))))

(define (make-promise-thunk thunk)
  (let ((done #f) (value #f))
    (lambda ()
      (if done value (begin (set! value (thunk)) (set! done #t) value)))))

(define (force p) (p))
`;
