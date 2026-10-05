/**
 * AwkFormat - printf/sprintf formatting for awk (XCU awk "Output Statements",
 * XBD File Format Notation): conversions d i o u x X c s e E f F g G %,
 * flags `- + space # 0`, field width and precision (including `*`).
 */
import { Cell, NUM, UNINIT_CELL, toNumber } from './AwkValue';
import { formatExponent, formatFixed, formatGeneral } from '../../../utils/FloatFormat';

/** Converts a value to its string form (numbers via CONVFMT). */
export type CellToString = (c: Cell) => string;

interface Spec {
    flags: string;
    width: number;
    precision?: number;
}

function pad(spec: Spec, prefix: string, body: string, zeroOk: boolean): string {
    const len = prefix.length + body.length;
    if (len >= spec.width) return prefix + body;
    const fill = spec.width - len;
    if (spec.flags.includes('-')) return prefix + body + ' '.repeat(fill);
    if (zeroOk && spec.flags.includes('0')) return prefix + '0'.repeat(fill) + body;
    return ' '.repeat(fill) + prefix + body;
}

function signPrefix(negative: boolean, flags: string): string {
    if (negative) return '-';
    if (flags.includes('+')) return '+';
    if (flags.includes(' ')) return ' ';
    return '';
}

/** Formats a double for %e %f %g (and their upper-case forms), C-exact. */
export function formatFloat(conv: string, value: number, flags: string, precision?: number): { prefix: string; body: string; finite: boolean } {
    const negative = value < 0 || Object.is(value, -0);
    const prefix = signPrefix(negative && !Number.isNaN(value), flags);
    const upper = conv === 'E' || conv === 'F' || conv === 'G';
    if (!Number.isFinite(value)) {
        const body = Number.isNaN(value) ? 'nan' : 'inf';
        return { prefix, body: upper ? body.toUpperCase() : body, finite: false };
    }
    const x = Math.abs(value);
    const p = precision ?? 6;
    const alt = flags.includes('#');
    let body: string;
    switch (conv.toLowerCase()) {
        case 'e': body = formatExponent(x, p, alt); break;
        case 'f': body = formatFixed(x, p) + (alt && p === 0 ? '.' : ''); break;
        default: body = formatGeneral(x, p, alt); break;
    }
    return { prefix, body: upper ? body.toUpperCase() : body, finite: true };
}

function formatInteger(conv: string, value: number, spec: Spec): string {
    if (!Number.isFinite(value)) {
        const f = formatFloat('f', value, spec.flags);
        return pad(spec, f.prefix, f.body, false);
    }
    let n = BigInt(Math.trunc(value));
    let prefix = '';
    let digits: string;
    if (conv === 'd' || conv === 'i') {
        prefix = signPrefix(n < BigInt(0), spec.flags);
        if (n < BigInt(0)) n = -n;
        digits = n.toString();
    } else {
        if (n < BigInt(0)) n = BigInt.asUintN(64, n);
        digits = n.toString(conv === 'o' ? 8 : conv === 'u' ? 10 : 16);
        if (conv === 'X') digits = digits.toUpperCase();
        if (spec.flags.includes('#')) {
            if (conv === 'o' && digits[0] !== '0') digits = '0' + digits;
            if ((conv === 'x' || conv === 'X') && n !== BigInt(0)) prefix = conv === 'x' ? '0x' : '0X';
        }
    }
    if (spec.precision !== undefined) {
        if (spec.precision === 0 && digits === '0') digits = '';
        if (digits.length < spec.precision) digits = '0'.repeat(spec.precision - digits.length) + digits;
    }
    return pad(spec, prefix, digits, spec.precision === undefined);
}

function charOf(c: Cell, toStr: CellToString): string {
    if (c.t === NUM) {
        const code = Math.trunc(c.n);
        if (code >= 0 && code < 256) return String.fromCharCode(code);
        try { return String.fromCodePoint(code); } catch { return ''; }
    }
    const s = toStr(c);
    if (s === '') return '';
    return String.fromCodePoint(s.codePointAt(0)!);
}

/** awk sprintf(): formats `args` according to `fmt`. Missing arguments act as uninitialized values. */
export function awkSprintf(fmt: string, args: Cell[], toStr: CellToString): string {
    let out = '';
    let ai = 0;
    const nextArg = (): Cell => (ai < args.length ? args[ai++] : UNINIT_CELL);
    for (let i = 0; i < fmt.length; i++) {
        const ch = fmt[i];
        if (ch !== '%') { out += ch; continue; }
        const start = i;
        let j = i + 1;
        let flags = '';
        while (j < fmt.length && '-+ #0'.includes(fmt[j])) flags += fmt[j++];
        let width = 0;
        if (fmt[j] === '*') {
            width = Math.trunc(toNumber(nextArg()));
            if (width < 0) { flags += '-'; width = -width; }
            j++;
        } else {
            while (j < fmt.length && fmt[j] >= '0' && fmt[j] <= '9') width = width * 10 + (fmt.charCodeAt(j++) - 48);
        }
        let precision: number | undefined;
        if (fmt[j] === '.') {
            j++;
            if (fmt[j] === '*') {
                const p = Math.trunc(toNumber(nextArg()));
                precision = p < 0 ? undefined : p;
                j++;
            } else {
                precision = 0;
                while (j < fmt.length && fmt[j] >= '0' && fmt[j] <= '9') precision = precision * 10 + (fmt.charCodeAt(j++) - 48);
            }
        }
        while (j < fmt.length && 'hlLqjzt'.includes(fmt[j])) j++;
        const conv = fmt[j];
        if (conv === undefined) { out += fmt.slice(start); break; }
        const spec: Spec = { flags, width, precision };
        switch (conv) {
            case '%': out += '%'; break;
            case 'd': case 'i': case 'o': case 'u': case 'x': case 'X':
                out += formatInteger(conv, toNumber(nextArg()), spec);
                break;
            case 'e': case 'E': case 'f': case 'F': case 'g': case 'G': {
                const f = formatFloat(conv, toNumber(nextArg()), flags, precision);
                out += pad(spec, f.prefix, f.body, f.finite);
                break;
            }
            case 'c':
                out += pad(spec, '', charOf(nextArg(), toStr), false);
                break;
            case 's': {
                let s = toStr(nextArg());
                if (precision !== undefined && s.length > precision) s = s.slice(0, precision);
                out += pad(spec, '', s, false);
                break;
            }
            default:
                // Not a conversion: output literally.
                out += fmt.slice(start, j + 1);
        }
        i = j;
    }
    return out;
}
