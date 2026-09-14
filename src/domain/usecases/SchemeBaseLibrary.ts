/**
 * SchemeBaseLibrary - Domain Use Case Layer
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * (scheme base) -- The Procedures
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SchemePrimitives covers arithmetic and the list basics. This module supplies
 * the rest of what R7RS-small calls the base library: equivalence, the string
 * and character libraries, vectors, the numeric tower's real operations, the
 * assoc/member families, and multiple values.
 *
 * Without these, Scheme is unwritable in practice -- there was no `equal?`, no
 * way to join two strings, and no way to index a vector.
 *
 * Every procedure here is PURE with respect to the host: no I/O, no clock, no
 * randomness. Side-effecting procedures belong in the interface-adapter layer
 * where they can be pointed at the terminal.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
    SchemeValue, makeNumber, makeBoolean, makeString, makeSymbol, makeChar,
    makeVector, makePair, NIL, arrayToList, listToArray, schemeToString
} from '../entities/SchemeValue';
import { PrimitiveDefinition } from './SchemePrimitives';
import { SchemeRaise } from './SchemeVM';

// ─────────────────────────────────────────────────────────────────────────────
// Equivalence
// ─────────────────────────────────────────────────────────────────────────────

/**
 * eqv? -- identity for atoms, reference identity for aggregates.
 *
 * Our values are structurally immutable records rather than pointers, so for
 * atoms we compare type and value, which matches what a player can observe.
 */
export const isEqv = (a: SchemeValue, b: SchemeValue): boolean => {
    if (a === b) return true;
    if (a.type !== b.type) return false;
    switch (a.type) {
        case 'number':
        case 'string':
        case 'boolean':
        case 'char':
        case 'symbol':
            return a.value === b.value;
        case 'null':
            return true;
        default:
            return false;   // pairs, vectors, procedures: identity only
    }
};

/** equal? -- structural comparison, recursing through pairs and vectors. */
export const isEqual = (a: SchemeValue, b: SchemeValue): boolean => {
    if (isEqv(a, b)) return true;
    if (a.type !== b.type) return false;

    if (a.type === 'pair') {
        return isEqual(a.value.car, (b.value as any).car)
            && isEqual(a.value.cdr, (b.value as any).cdr);
    }
    if (a.type === 'vector') {
        const x = a.value as SchemeValue[];
        const y = b.value as SchemeValue[];
        return x.length === y.length && x.every((v, i) => isEqual(v, y[i]));
    }
    if (a.type === 'string') return a.value === b.value;
    return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const num = (v: SchemeValue): number => {
    if (v.type !== 'number') throw new Error(`expected a number, got ${schemeToString(v)}`);
    return v.value as number;
};
const str = (v: SchemeValue): string => {
    if (v.type !== 'string') throw new Error(`expected a string, got ${schemeToString(v)}`);
    return v.value as string;
};
const vec = (v: SchemeValue): SchemeValue[] => {
    if (v.type !== 'vector') throw new Error(`expected a vector, got ${schemeToString(v)}`);
    return v.value as SchemeValue[];
};
const chr = (v: SchemeValue): string => {
    if (v.type !== 'char') throw new Error(`expected a character, got ${schemeToString(v)}`);
    return v.value as string;
};

/** Chains a comparison across all arguments, as R7RS requires: (< 1 2 3). */
const chain = (f: (a: number, b: number) => boolean) => (args: SchemeValue[]): SchemeValue => {
    for (let i = 0; i < args.length - 1; i++) {
        if (!f(num(args[i]), num(args[i + 1]))) return makeBoolean(false);
    }
    return makeBoolean(true);
};

const chainStr = (f: (a: string, b: string) => boolean) => (args: SchemeValue[]): SchemeValue => {
    for (let i = 0; i < args.length - 1; i++) {
        if (!f(str(args[i]), str(args[i + 1]))) return makeBoolean(false);
    }
    return makeBoolean(true);
};

/**
 * Multiple values are carried as a tagged vector so they can travel on the
 * ordinary value stack; call-with-values unpacks them.
 */
const VALUES_TAG = '#<values>';
export const makeValues = (vals: SchemeValue[]): SchemeValue =>
    vals.length === 1 ? vals[0] : ({ type: 'vector', value: [makeSymbol(VALUES_TAG), ...vals] } as SchemeValue);
export const isValues = (v: SchemeValue): boolean =>
    v.type === 'vector' && (v.value as SchemeValue[])[0]?.type === 'symbol'
    && (v.value as SchemeValue[])[0].value === VALUES_TAG.toLowerCase();
export const valuesOf = (v: SchemeValue): SchemeValue[] =>
    isValues(v) ? (v.value as SchemeValue[]).slice(1) : [v];

// ─────────────────────────────────────────────────────────────────────────────
// The library
// ─────────────────────────────────────────────────────────────────────────────

export const getBaseLibrary = (): PrimitiveDefinition[] => [

    // ── equivalence ──────────────────────────────────────────────────────────
    // eq? is permitted to be eqv? for everything except mutable aggregates,
    // which we do not have, so the two coincide here.
    { name: 'eq?',    func: (a) => makeBoolean(isEqv(a[0], a[1])) },
    { name: 'eqv?',   func: (a) => makeBoolean(isEqv(a[0], a[1])) },
    { name: 'equal?', func: (a) => makeBoolean(isEqual(a[0], a[1])) },

    // ── numeric ──────────────────────────────────────────────────────────────
    { name: 'sqrt',     func: (a) => makeNumber(Math.sqrt(num(a[0]))) },
    { name: 'exact',    func: (a) => makeNumber(Math.round(num(a[0]))) },
    { name: 'inexact',  func: (a) => makeNumber(num(a[0])) },
    { name: 'exact->inexact', func: (a) => makeNumber(num(a[0])) },
    { name: 'inexact->exact', func: (a) => makeNumber(Math.round(num(a[0]))) },
    { name: 'expt',     func: (a) => makeNumber(Math.pow(num(a[0]), num(a[1]))) },
    { name: 'floor',    func: (a) => makeNumber(Math.floor(num(a[0]))) },
    { name: 'ceiling',  func: (a) => makeNumber(Math.ceil(num(a[0]))) },
    { name: 'truncate', func: (a) => makeNumber(Math.trunc(num(a[0]))) },
    { name: 'round',    func: (a) => makeNumber(Math.round(num(a[0]))) },
    { name: 'exp',      func: (a) => makeNumber(Math.exp(num(a[0]))) },
    { name: 'log',      func: (a) => makeNumber(a.length > 1 ? Math.log(num(a[0])) / Math.log(num(a[1])) : Math.log(num(a[0]))) },
    { name: 'sin',      func: (a) => makeNumber(Math.sin(num(a[0]))) },
    { name: 'cos',      func: (a) => makeNumber(Math.cos(num(a[0]))) },
    { name: 'tan',      func: (a) => makeNumber(Math.tan(num(a[0]))) },
    { name: 'atan',     func: (a) => makeNumber(a.length > 1 ? Math.atan2(num(a[0]), num(a[1])) : Math.atan(num(a[0]))) },
    { name: 'gcd',      func: (a) => { const g = (x: number, y: number): number => y ? g(y, x % y) : Math.abs(x); return makeNumber(a.map(num).reduce(g, 0)); } },
    { name: 'lcm',      func: (a) => { const g = (x: number, y: number): number => y ? g(y, x % y) : Math.abs(x); return makeNumber(a.map(num).reduce((x, y) => Math.abs(x * y) / (g(x, y) || 1), 1)); } },
    { name: 'zero?',     func: (a) => makeBoolean(num(a[0]) === 0) },
    { name: 'positive?', func: (a) => makeBoolean(num(a[0]) > 0) },
    { name: 'negative?', func: (a) => makeBoolean(num(a[0]) < 0) },
    { name: 'even?',     func: (a) => makeBoolean(num(a[0]) % 2 === 0) },
    { name: 'odd?',      func: (a) => makeBoolean(Math.abs(num(a[0]) % 2) === 1) },
    { name: 'exact?',    func: (a) => makeBoolean(Number.isInteger(num(a[0]))) },
    { name: 'inexact?',  func: (a) => makeBoolean(!Number.isInteger(num(a[0]))) },
    { name: 'integer?',  func: (a) => makeBoolean(a[0].type === 'number' && Number.isInteger(a[0].value)) },
    { name: 'rational?', func: (a) => makeBoolean(a[0].type === 'number' && Number.isFinite(a[0].value)) },
    { name: 'real?',     func: (a) => makeBoolean(a[0].type === 'number') },
    { name: 'nan?',      func: (a) => makeBoolean(Number.isNaN(num(a[0]))) },
    { name: 'square',    func: (a) => makeNumber(num(a[0]) * num(a[0])) },
    { name: 'truncate/', func: (a) => makeValues([makeNumber(Math.trunc(num(a[0]) / num(a[1]))), makeNumber(num(a[0]) % num(a[1]))]) },
    { name: 'floor/',    func: (a) => makeValues([makeNumber(Math.floor(num(a[0]) / num(a[1]))), makeNumber(((num(a[0]) % num(a[1])) + num(a[1])) % num(a[1]))]) },

    // ── comparison chains (R7RS allows any arity) ────────────────────────────
    { name: '<',  func: chain((x, y) => x < y) },
    { name: '>',  func: chain((x, y) => x > y) },
    { name: '<=', func: chain((x, y) => x <= y) },
    { name: '>=', func: chain((x, y) => x >= y) },

    // ── pairs and lists ──────────────────────────────────────────────────────
    { name: 'caar', func: (a) => (a[0].value as any).car.value.car },
    { name: 'cadr', func: (a) => (a[0].value as any).cdr.value.car },
    { name: 'cdar', func: (a) => (a[0].value as any).car.value.cdr },
    { name: 'cddr', func: (a) => (a[0].value as any).cdr.value.cdr },
    { name: 'caddr', func: (a) => listToArray(a[0])[2] },
    { name: 'cadddr', func: (a) => listToArray(a[0])[3] },
    { name: 'list-tail', func: (a) => { let l = a[0]; for (let i = 0; i < num(a[1]); i++) l = (l.value as any).cdr; return l; } },
    { name: 'last', func: (a) => { const arr = listToArray(a[0]); return arr[arr.length - 1]; } },
    { name: 'list-copy', func: (a) => arrayToList(listToArray(a[0])) },

    { name: 'memq',  func: (a) => memGeneric(a[0], a[1], isEqv) },
    { name: 'memv',  func: (a) => memGeneric(a[0], a[1], isEqv) },
    { name: 'member',func: (a) => memGeneric(a[0], a[1], isEqual) },
    { name: 'assq',  func: (a) => assGeneric(a[0], a[1], isEqv) },
    { name: 'assv',  func: (a) => assGeneric(a[0], a[1], isEqv) },
    { name: 'assoc', func: (a) => assGeneric(a[0], a[1], isEqual) },

    // ── symbols ──────────────────────────────────────────────────────────────
    { name: 'symbol->string', func: (a) => makeString(a[0].value as string) },
    { name: 'string->symbol', func: (a) => makeSymbol(str(a[0])) },

    // ── characters ───────────────────────────────────────────────────────────
    { name: 'char?',          func: (a) => makeBoolean(a[0].type === 'char') },
    { name: 'char->integer',  func: (a) => makeNumber(chr(a[0]).charCodeAt(0)) },
    { name: 'integer->char',  func: (a) => makeChar(String.fromCharCode(num(a[0]))) },
    { name: 'char-upcase',    func: (a) => makeChar(chr(a[0]).toUpperCase()) },
    { name: 'char-downcase',  func: (a) => makeChar(chr(a[0]).toLowerCase()) },
    { name: 'char=?',         func: (a) => makeBoolean(a.every(c => chr(c) === chr(a[0]))) },
    { name: 'char<?',         func: (a) => makeBoolean(chr(a[0]) < chr(a[1])) },
    { name: 'char>?',         func: (a) => makeBoolean(chr(a[0]) > chr(a[1])) },
    { name: 'char-alphabetic?', func: (a) => makeBoolean(/[a-z]/i.test(chr(a[0]))) },
    { name: 'char-numeric?',    func: (a) => makeBoolean(/[0-9]/.test(chr(a[0]))) },
    { name: 'char-whitespace?', func: (a) => makeBoolean(/\s/.test(chr(a[0]))) },

    // ── strings ──────────────────────────────────────────────────────────────
    { name: 'string-length',  func: (a) => makeNumber(str(a[0]).length) },
    { name: 'string-append',  func: (a) => makeString(a.map(str).join('')) },
    { name: 'substring',      func: (a) => makeString(str(a[0]).slice(num(a[1]), a[2] ? num(a[2]) : undefined)) },
    { name: 'string-ref',     func: (a) => makeChar(str(a[0])[num(a[1])]) },
    { name: 'string-copy',    func: (a) => makeString(str(a[0]).slice(a[1] ? num(a[1]) : 0, a[2] ? num(a[2]) : undefined)) },
    { name: 'string-upcase',  func: (a) => makeString(str(a[0]).toUpperCase()) },
    { name: 'string-downcase',func: (a) => makeString(str(a[0]).toLowerCase()) },
    { name: 'string->list',   func: (a) => arrayToList(Array.from(str(a[0])).map(makeChar)) },
    { name: 'list->string',   func: (a) => makeString(listToArray(a[0]).map(chr).join('')) },
    { name: 'string',         func: (a) => makeString(a.map(chr).join('')) },
    { name: 'make-string',    func: (a) => makeString((a[1] ? chr(a[1]) : ' ').repeat(num(a[0]))) },
    { name: 'string=?',       func: chainStr((x, y) => x === y) },
    { name: 'string<?',       func: chainStr((x, y) => x < y) },
    { name: 'string>?',       func: chainStr((x, y) => x > y) },
    { name: 'string-ci=?',    func: (a) => makeBoolean(a.every(s => str(s).toLowerCase() === str(a[0]).toLowerCase())) },
    { name: 'string-null?',   func: (a) => makeBoolean(str(a[0]).length === 0) },
    { name: 'string-contains',func: (a) => { const i = str(a[0]).indexOf(str(a[1])); return i < 0 ? makeBoolean(false) : makeNumber(i); } },
    { name: 'number->string', func: (a) => makeString(a[1] ? num(a[0]).toString(num(a[1])) : String(num(a[0]))) },
    { name: 'string->number', func: (a) => { const n = a[1] ? parseInt(str(a[0]), num(a[1])) : Number(str(a[0])); return Number.isNaN(n) ? makeBoolean(false) : makeNumber(n); } },

    // ── vectors ──────────────────────────────────────────────────────────────
    { name: 'vector',        func: (a) => makeVector([...a]) },
    { name: 'vector?',       func: (a) => makeBoolean(a[0].type === 'vector') },
    { name: 'make-vector',   func: (a) => makeVector(new Array(num(a[0])).fill(a[1] ?? NIL)) },
    { name: 'vector-length', func: (a) => makeNumber(vec(a[0]).length) },
    { name: 'vector-ref',    func: (a) => vec(a[0])[num(a[1])] },
    { name: 'vector-set!',   func: (a) => { vec(a[0])[num(a[1])] = a[2]; return a[0]; } },
    { name: 'vector->list',  func: (a) => arrayToList(vec(a[0])) },
    { name: 'list->vector',  func: (a) => makeVector(listToArray(a[0])) },
    { name: 'vector-fill!',  func: (a) => { const v = vec(a[0]); v.fill(a[1]); return a[0]; } },

    // ── multiple values ──────────────────────────────────────────────────────
    { name: 'values', func: (a) => makeValues(a) },
    // Bridges the tagged-vector representation back to a list so
    // call-with-values can spread it with `apply`.
    { name: '%values->list', func: (a) => arrayToList(valuesOf(a[0])) },

    // ── conditions ───────────────────────────────────────────────────────────
    // These throw across the host stack; the VM's interpreter loop catches
    // them and routes them to the innermost `guard`.
    { name: 'raise',             func: (a) => { throw new SchemeRaise(a[0]); } },
    { name: 'raise-continuable', func: (a) => { throw new SchemeRaise(a[0]); } },
    { name: 'error', func: (a) => {
        const parts = [str(a[0]), ...a.slice(1).map(schemeToString)];
        throw new SchemeRaise(makeString(parts.join(' ')));
    } },
    { name: 'error-object?',   func: (a) => makeBoolean(a[0].type === 'string') },
    { name: 'error-object-message', func: (a) => a[0] },
    // Applied by the VM (it must install control state), never called here.
    { name: '%guard', func: () => { throw new Error('%guard: internal error, VM should handle this specially'); } },

    // ── booleans ─────────────────────────────────────────────────────────────
    { name: 'boolean=?', func: (a) => makeBoolean(a.every(b => b.value === a[0].value)) },
];

const memGeneric = (x: SchemeValue, list: SchemeValue, eq: (a: SchemeValue, b: SchemeValue) => boolean): SchemeValue => {
    let cur = list;
    while (cur.type === 'pair') {
        if (eq(x, cur.value.car as SchemeValue)) return cur;
        cur = cur.value.cdr as SchemeValue;
    }
    return makeBoolean(false);
};

const assGeneric = (key: SchemeValue, alist: SchemeValue, eq: (a: SchemeValue, b: SchemeValue) => boolean): SchemeValue => {
    for (const entry of listToArray(alist)) {
        if (entry.type === 'pair' && eq(key, entry.value.car as SchemeValue)) return entry;
    }
    return makeBoolean(false);
};
