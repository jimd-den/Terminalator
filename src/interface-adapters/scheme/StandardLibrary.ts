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

export const registerStandardLibrary = () => {
    const registry = ProcedureRegistry.getInstance();

    // 1. Register Pure Domain Primitives
    const purePrims = getPurePrimitives();
    for (const prim of purePrims) {
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

export const getPrelude = (): string => `
(define (map f l)
  (if (null? l)
      '()
      (cons (f (car l)) (map f (cdr l)))))

(define (for-each f l)
  (if (null? l)
      #t
      (begin
        (f (car l))
        (for-each f (cdr l)))))
`;
