/**
 * FloatFormat - C printf-exact formatting of doubles (%f, %e, %g).
 *
 * JavaScript's toFixed/toExponential round exact ties away from zero
 * (2.5 → "3", 0.125 → "0.13"), while C's printf rounds the exact binary
 * value half-to-even ("2", "0.12"). These helpers expand the double into
 * its exact decimal value with BigInt arithmetic and round from there.
 *
 * All functions take a finite, non-negative value; callers handle the sign,
 * infinities and NaN.
 */

const TEN = BigInt(10);

/** The double's exact value as `digits / 10^scale`. */
function exactDecimal(x: number): { digits: bigint; scale: number } {
    if (x === 0) return { digits: BigInt(0), scale: 0 };
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, x);
    const hi = view.getUint32(0);
    const lo = view.getUint32(4);
    const biased = (hi >>> 20) & 0x7ff;
    let mant = (BigInt(hi & 0xfffff) << BigInt(32)) | BigInt(lo);
    let exp: number;
    if (biased === 0) exp = -1074;
    else { mant |= BigInt(1) << BigInt(52); exp = biased - 1075; }
    if (exp >= 0) return { digits: mant << BigInt(exp), scale: 0 };
    // m * 2^-k = m * 5^k / 10^k
    return { digits: mant * BigInt(5) ** BigInt(-exp), scale: -exp };
}

/** Rounds `n / div` to the nearest integer, ties to even. */
function divRoundEven(n: bigint, div: bigint): bigint {
    const q = n / div;
    const r2 = (n % div) * BigInt(2);
    if (r2 > div || (r2 === div && q % BigInt(2) === BigInt(1))) return q + BigInt(1);
    return q;
}

/** `%.<prec>f` of x >= 0. */
export function formatFixed(x: number, prec: number): string {
    const { digits, scale } = exactDecimal(x);
    const scaled = prec >= scale ? digits * TEN ** BigInt(prec - scale) : divRoundEven(digits, TEN ** BigInt(scale - prec));
    let s = scaled.toString();
    if (prec === 0) return s;
    if (s.length <= prec) s = '0'.repeat(prec - s.length + 1) + s;
    return s.slice(0, s.length - prec) + '.' + s.slice(s.length - prec);
}

/** Mantissa digits (prec+1 of them) and decimal exponent of x >= 0 rounded to prec+1 significant digits. */
function significant(x: number, prec: number): { digits: string; exp: number } {
    if (x === 0) return { digits: '0'.repeat(prec + 1), exp: 0 };
    const { digits, scale } = exactDecimal(x);
    const s = digits.toString();
    let exp = s.length - 1 - scale;
    const keep = prec + 1;
    if (s.length <= keep) return { digits: s + '0'.repeat(keep - s.length), exp };
    let head = BigInt(s.slice(0, keep));
    const rest = s.slice(keep);
    const first = rest.charCodeAt(0) - 48;
    const tail = rest.slice(1);
    const up = first > 5 || (first === 5 && (/[1-9]/.test(tail) || head % BigInt(2) === BigInt(1)));
    if (up) head += BigInt(1);
    let out = head.toString();
    if (out.length > keep) { exp++; out = out.slice(0, keep); }
    return { digits: out, exp };
}

/** `%.<prec>e` of x >= 0 (lower-case 'e'). */
export function formatExponent(x: number, prec: number, alt = false): string {
    const { digits, exp } = significant(x, prec);
    const mant = digits[0] + (prec > 0 || alt ? '.' : '') + digits.slice(1);
    const e = Math.abs(exp);
    return `${mant}e${exp < 0 ? '-' : '+'}${e < 10 ? '0' : ''}${e}`;
}

/** `%.<prec>g` of x >= 0; `alt` (the '#' flag) keeps trailing zeros. */
export function formatGeneral(x: number, prec: number, alt = false): string {
    const p = prec === 0 ? 1 : prec;
    const { exp } = significant(x, p - 1);
    let s = p > exp && exp >= -4 ? formatFixed(x, p - 1 - exp) : formatExponent(x, p - 1, alt);
    if (alt) {
        if (!s.includes('.') && !s.includes('e')) s += '.';
        return s;
    }
    if (s.includes('e')) {
        const [m, e] = s.split('e');
        return (m.includes('.') ? m.replace(/\.?0+$/, '') : m) + 'e' + e;
    }
    return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}
