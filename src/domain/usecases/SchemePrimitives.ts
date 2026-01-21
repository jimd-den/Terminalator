/**
 * SchemePrimitives - Domain Use Case Layer
 * 
 * Contains the core, pure R7RS-compliant primitives for the Scheme language.
 * These are host-agnostic and represent the fundamental logic of the language.
 * 
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * Pillar: THE FOUR-FOLD SHIELD (Dependency Minimalism)
 * 
 * Intent:
 * Provides a library of pure functions (+, -, car, cdr, etc.) 
 * that the Evaluator can bridge to.
 */

import {
    SchemeValue,
    makeNumber,
    makeBoolean,
    makePair,
    NIL,
    listToArray,
    isList
} from '../entities/SchemeValue';

export interface PrimitiveDefinition {
    name: string;
    func: (args: SchemeValue[]) => SchemeValue;
}

export const getPurePrimitives = (): PrimitiveDefinition[] => [
    // --- Arithmetic ---
    { name: '+', func: (args) => makeNumber(args.reduce((acc, v) => acc + v.value, 0)) },
    { name: '-', func: (args) => makeNumber(args.slice(1).reduce((acc, v) => acc - v.value, args[0].value)) },
    { name: '*', func: (args) => makeNumber(args.reduce((acc, v) => acc * v.value, 1)) },
    { name: '/', func: (args) => makeNumber(args.slice(1).reduce((acc, v) => acc / v.value, args[0].value)) },

    // --- Comparisons ---
    { name: '=', func: (args) => makeBoolean(args.every(v => v.value === args[0].value)) },
    { name: '<', func: (args) => makeBoolean(args[0].value < args[1].value) },
    { name: '>', func: (args) => makeBoolean(args[0].value > args[1].value) },
    { name: '<=', func: (args) => makeBoolean(args[0].value <= args[1].value) },
    { name: '>=', func: (args) => makeBoolean(args[0].value >= args[1].value) },

    // --- Numeric Operations ---
    { name: 'abs', func: (args) => makeNumber(Math.abs(args[0].value)) },
    { name: 'quotient', func: (args) => makeNumber(Math.trunc(args[0].value / args[1].value)) },
    { name: 'remainder', func: (args) => makeNumber(args[0].value % args[1].value) },
    {
        name: 'modulo', func: (args) => {
            const n = args[0].value;
            const d = args[1].value;
            return makeNumber(((n % d) + d) % d);
        }
    },
    { name: 'max', func: (args) => makeNumber(Math.max(...args.map(a => a.value))) },
    { name: 'min', func: (args) => makeNumber(Math.min(...args.map(a => a.value))) },

    // --- Logic ---
    { name: 'not', func: (args) => makeBoolean(args[0].type === 'boolean' && args[0].value === false) },
    { name: 'boolean?', func: (args) => makeBoolean(args[0].type === 'boolean') },

    // --- List Operations ---
    { name: 'cons', func: (args) => makePair(args[0], args[1]) },
    {
        name: 'car', func: (args) => {
            if (args[0].type !== 'pair') throw new Error('car: expected pair');
            return args[0].value.car;
        }
    },
    {
        name: 'cdr', func: (args) => {
            if (args[0].type !== 'pair') throw new Error('cdr: expected pair');
            return args[0].value.cdr;
        }
    },
    { name: 'list', func: (args) => args.reduceRight((acc, v) => makePair(v, acc), NIL) },
    { name: 'null?', func: (args) => makeBoolean(args[0].type === 'null') },
    { name: 'pair?', func: (args) => makeBoolean(args[0].type === 'pair') },
    { name: 'list?', func: (args) => makeBoolean(isList(args[0])) },
    {
        name: 'list-ref', func: (args) => {
            const list = listToArray(args[0]);
            const idx = args[1].value;
            if (idx < 0 || idx >= list.length) throw new Error('list-ref: index out of bounds');
            return list[idx];
        }
    },
    { name: 'length', func: (args) => makeNumber(listToArray(args[0]).length) },
    {
        name: 'append', func: (args) => {
            if (args.length === 0) return NIL;
            let res = args[args.length - 1];
            for (let i = args.length - 2; i >= 0; i--) {
                const arr = listToArray(args[i]);
                res = arr.reduceRight((acc, v) => makePair(v, acc), res);
            }
            return res;
        }
    },
    {
        name: 'reverse', func: (args) => {
            const arr = listToArray(args[0]);
            return arr.reduce((acc, v) => makePair(v, acc), NIL);
        }
    },

    // --- Type Predicates ---
    { name: 'number?', func: (args) => makeBoolean(args[0].type === 'number') },
    { name: 'symbol?', func: (args) => makeBoolean(args[0].type === 'symbol') },
    { name: 'string?', func: (args) => makeBoolean(args[0].type === 'string') },
    { name: 'procedure?', func: (args) => makeBoolean(args[0].type === 'procedure') }
];
