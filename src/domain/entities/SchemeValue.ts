/**
 * SchemeValue - Domain Layer Entity
 * 
 * Defines the core recursive data types for the Scheme language.
 * Adheres to the "Primitive obsession" avoidance rule by wrapping types.
 * 
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * Pillar: THE BALANCED SCALE (KISS)
 * Pillar: THE FOUR-FOLD SHIELD (Strict Architecture)
 * 
 * Intent:
 * Provides a robust, type-safe representation of Scheme S-expressions.
 * Supports numbers, symbols, booleans, strings, pairs (lists), and procedures.
 */

export type SchemeType =
    | 'number'
    | 'symbol'
    | 'boolean'
    | 'string'
    | 'pair'
    | 'null'
    | 'procedure'
    | 'keyword'; // for internal use like 'define', 'lambda'

export interface SchemeValue {
    readonly type: SchemeType;
    readonly value: any;
}

/**
 * Creates a Scheme Number
 */
export const makeNumber = (n: number): SchemeValue => ({ type: 'number', value: n });

/**
 * Creates a Scheme Symbol
 */
export const makeSymbol = (name: string): SchemeValue => ({ type: 'symbol', value: name.toLowerCase() });

/**
 * Creates a Scheme Boolean
 */
export const makeBoolean = (b: boolean): SchemeValue => ({ type: 'boolean', value: b });

/**
 * Creates a Scheme String
 */
export const makeString = (s: string): SchemeValue => ({ type: 'string', value: s });

/**
 * Creates a Scheme Pair (Cons cell)
 */
export const makePair = (car: SchemeValue, cdr: SchemeValue): SchemeValue => ({
    type: 'pair',
    value: { car, cdr }
});

/**
 * The Empty List (Null)
 */
export const NIL: SchemeValue = { type: 'null', value: null };

/**
 * Creates a Scheme Procedure (Closure or Built-in)
 */
export interface Procedure {
    readonly name?: string;
    readonly isBuiltin: boolean;
    readonly params?: string[];
    readonly body?: SchemeValue;
    readonly env?: any; // Will be typed as Environment
    readonly call?: (args: SchemeValue[]) => SchemeValue;
}

export const makeProcedure = (proc: Procedure): SchemeValue => ({
    type: 'procedure',
    value: proc
});

/**
 * Utility: Check if a value is a list
 */
export const isList = (v: SchemeValue): boolean => {
    if (v.type === 'null') return true;
    if (v.type !== 'pair') return false;
    return isList(v.value.cdr);
};

/**
 * Utility: Convert JS array of SchemeValues to a Scheme List
 */
export const arrayToList = (arr: SchemeValue[]): SchemeValue => {
    return arr.reduceRight((acc, val) => makePair(val, acc), NIL);
};

/**
 * Utility: Convert Scheme List to JS array
 */
export const listToArray = (list: SchemeValue): SchemeValue[] => {
    const arr: SchemeValue[] = [];
    let curr = list;
    while (curr.type === 'pair') {
        arr.push(curr.value.car);
        curr = curr.value.cdr;
    }
    return arr;
};

/**
 * Utility: String representation for the REPL
 */
export const schemeToString = (v: SchemeValue): string => {
    switch (v.type) {
        case 'number': return String(v.value);
        case 'symbol': return v.value;
        case 'boolean': return v.value ? '#t' : '#f';
        case 'string': return `"${v.value}"`;
        case 'null': return '()';
        case 'pair': {
            const items = listToArray(v);
            const isProper = isList(v);
            if (isProper) {
                return `(${items.map(schemeToString).join(' ')})`;
            } else {
                // Dotted pair
                return `(${schemeToString(v.value.car)} . ${schemeToString(v.value.cdr)})`;
            }
        }
        case 'procedure': return `#<procedure${v.value.name ? `:${v.value.name}` : ''}>`;
        default: return '#<unknown>';
    }
};
