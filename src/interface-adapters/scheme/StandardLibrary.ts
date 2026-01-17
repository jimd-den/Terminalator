/**
 * StandardLibrary - Interface Adapter Layer
 * 
 * Registers the base R7RS-compatible procedures in the ProcedureRegistry.
 * Includes math, list, logic, and comparison functions.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture)
 * Pillar: THE MASTER’S TOOL (Registry Pattern)
 * 
 * Intent:
 * Provides the essential tools for Scheme programming.
 * Ensures that the core language is useful for the end user.
 */

import { SchemeValue, makeNumber, makeBoolean, makePair, NIL, listToArray, isList } from '../../domain/entities/SchemeValue';
import { ProcedureRegistry } from '../../domain/entities/ProcedureRegistry';

export const registerStandardLibrary = () => {
    const registry = ProcedureRegistry.getInstance();

    // --- Arithmetic ---
    registry.register('+', (args) => makeNumber(args.reduce((acc, v) => acc + v.value, 0)));
    registry.register('-', (args) => makeNumber(args.slice(1).reduce((acc, v) => acc - v.value, args[0].value)));
    registry.register('*', (args) => makeNumber(args.reduce((acc, v) => acc * v.value, 1)));
    registry.register('/', (args) => makeNumber(args.slice(1).reduce((acc, v) => acc / v.value, args[0].value)));

    // --- Comparisons ---
    registry.register('=', (args) => makeBoolean(args.every(v => v.value === args[0].value)));
    registry.register('<', (args) => makeBoolean(args[0].value < args[1].value));
    registry.register('>', (args) => makeBoolean(args[0].value > args[1].value));
    registry.register('<=', (args) => makeBoolean(args[0].value <= args[1].value));
    registry.register('>=', (args) => makeBoolean(args[0].value >= args[1].value));

    // --- Logic ---
    registry.register('not', (args) => makeBoolean(args[0].type === 'boolean' && args[0].value === false));

    // --- List Operations ---
    registry.register('cons', (args) => makePair(args[0], args[1]));
    registry.register('car', (args) => {
        if (args[0].type !== 'pair') throw new Error('car: expected pair');
        return args[0].value.car;
    });
    registry.register('cdr', (args) => {
        if (args[0].type !== 'pair') throw new Error('cdr: expected pair');
        return args[0].value.cdr;
    });
    registry.register('list', (args) => {
        return args.reduceRight((acc, v) => makePair(v, acc), NIL);
    });
    registry.register('null?', (args) => makeBoolean(args[0].type === 'null'));
    registry.register('pair?', (args) => makeBoolean(args[0].type === 'pair'));

    // --- Testing/Output ---
    registry.register('display', (args) => {
        // In a real terminal, this would pipe to output. For now, we return the value.
        // The command handler will handle the actual printing.
        return args[0];
    });
};
