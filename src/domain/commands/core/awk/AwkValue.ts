/**
 * AwkValue - awk's dynamically typed scalar values (XCU awk, "Expressions in awk").
 *
 * A value is a number, a string, a *numeric string* (strnum: input that looks
 * like a number - fields, getline input, split() elements, ARGV, ENVIRON and
 * command-line assignments) or *uninitialized* (both 0 and ""). Comparisons
 * are numeric when both sides are numeric (number, strnum or uninitialized)
 * and string comparisons otherwise.
 */

export const UNINIT = 0;
export const NUM = 1;
export const STR = 2;
export const STRNUM = 3;
export type ValueType = typeof UNINIT | typeof NUM | typeof STR | typeof STRNUM;

export interface Cell {
    readonly t: ValueType;
    /** Numeric value (NUM, STRNUM; 0 for UNINIT). */
    readonly n: number;
    /** String value (STR, STRNUM; "" for UNINIT). */
    readonly s: string;
}

export const UNINIT_CELL: Cell = Object.freeze({ t: UNINIT, n: 0, s: '' }) as Cell;
export const EMPTY_STR: Cell = Object.freeze({ t: STR, n: 0, s: '' }) as Cell;
export const ZERO: Cell = Object.freeze({ t: NUM, n: 0, s: '' }) as Cell;
export const ONE: Cell = Object.freeze({ t: NUM, n: 1, s: '' }) as Cell;

export const num = (n: number): Cell => ({ t: NUM, n, s: '' });
export const str = (s: string): Cell => ({ t: STR, n: 0, s });
export const bool = (b: boolean): Cell => (b ? ONE : ZERO);

const LEADING_NUMBER = /^[ \t\n\r\f\v]*([-+]?(?:[0-9]+\.?[0-9]*(?:[eE][-+]?[0-9]+)?|\.[0-9]+(?:[eE][-+]?[0-9]+)?))/;
const WHOLE_NUMBER = /^[ \t\n\r\f\v]*[-+]?(?:[0-9]+\.?[0-9]*(?:[eE][-+]?[0-9]+)?|\.[0-9]+(?:[eE][-+]?[0-9]+)?)[ \t\n\r\f\v]*$/;

/** strtod-like: the longest leading decimal number, or 0. */
export function stringToNumber(s: string): number {
    const m = LEADING_NUMBER.exec(s);
    return m ? parseFloat(m[1]) : 0;
}

/** A value from input: a strnum when the whole string looks numeric. */
export function strnum(s: string): Cell {
    if (WHOLE_NUMBER.test(s)) return { t: STRNUM, n: parseFloat(s), s };
    return { t: STR, n: 0, s };
}

/** Formats numbers with a printf-style format (CONVFMT / OFMT). */
export type NumberFormatter = (fmt: string, n: number) => string;

const INT_LIMIT = 2 ** 63;

/** Number to string: integral values print as integers, others through `fmt`. */
export function numberToString(n: number, fmt: string, format: NumberFormatter): string {
    if (Number.isInteger(n) && Math.abs(n) < INT_LIMIT) {
        return Math.abs(n) < 2 ** 53 ? String(n === 0 ? 0 : n) : BigInt(n).toString();
    }
    return format(fmt, n);
}

export function toNumber(c: Cell): number {
    return c.t === STR ? stringToNumber(c.s) : c.n;
}

/** String value; numbers convert with `fmt` (CONVFMT, or OFMT for output). */
export function toStr(c: Cell, fmt: string, format: NumberFormatter): string {
    return c.t === NUM ? numberToString(c.n, fmt, format) : c.s;
}

export function toBool(c: Cell): boolean {
    switch (c.t) {
        case NUM: case STRNUM: return c.n !== 0;
        case STR: return c.s !== '';
        default: return false;
    }
}

export function isNumeric(c: Cell): boolean {
    return c.t !== STR;
}
