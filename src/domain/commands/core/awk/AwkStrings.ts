/**
 * AwkStrings - the pure string builtins of awk (XCU awk "String Functions"):
 * substr, index, length, match and the substitution engine of sub/gsub.
 */

/** Rounds like awk's double-to-integer conversion for substr (half to even). */
function roundEven(x: number): number {
    const r = Math.round(x);
    return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

/** substr(s, m[, n]): characters from position m (1-based) for n characters. */
export function substr(s: string, m: number, n?: number): string {
    if (Number.isNaN(m)) return '';
    const len = s.length;
    let start = roundEven(m);
    let end = n === undefined ? Infinity : Number.isNaN(n) ? -Infinity : start + roundEven(n);
    if (start < 1) start = 1;
    if (end > len + 1) end = len + 1;
    return end <= start ? '' : s.slice(start - 1, end - 1);
}

/** index(s, t): position of the first occurrence of t in s, or 0. */
export function index(s: string, t: string): number {
    if (t === '') return 0;
    return s.indexOf(t) + 1;
}

/** length(s) in characters. */
export function charLength(s: string): number {
    return /[\uD800-\uDFFF]/.test(s) ? Array.from(s).length : s.length;
}

/** match(): RSTART (1-based, 0 if none) and RLENGTH (-1 if none). */
export function matchPosition(s: string, re: RegExp): { start: number; length: number } {
    const m = re.exec(s);
    return m ? { start: m.index + 1, length: m[0].length } : { start: 0, length: -1 };
}

/**
 * Expands a sub/gsub replacement for one match: `&` is the matched text,
 * `\&` a literal ampersand and `\\` a literal backslash.
 */
function expandReplacement(repl: string, matched: string): string {
    if (!repl.includes('&') && !repl.includes('\\')) return repl;
    let out = '';
    for (let i = 0; i < repl.length; i++) {
        const c = repl[i];
        if (c === '\\' && (repl[i + 1] === '&' || repl[i + 1] === '\\')) { out += repl[++i]; continue; }
        out += c === '&' ? matched : c;
    }
    return out;
}

/**
 * sub (global=false) / gsub (global=true): replaces leftmost (all
 * non-overlapping) matches of `re` (a global RegExp) in `s`. An empty match
 * directly after a previous match is not replaced.
 */
export function substitute(s: string, re: RegExp, repl: string, global: boolean): { result: string; count: number } {
    let out = '';
    let pos = 0;
    let count = 0;
    let lastEnd = -1;
    while (pos <= s.length) {
        re.lastIndex = pos;
        const m = re.exec(s);
        if (!m) break;
        const start = m.index;
        const end = start + m[0].length;
        if (start === end && start === lastEnd) {
            // Empty match right after the previous one: skip a character.
            if (start >= s.length) break;
            out += s.slice(pos, start + 1);
            pos = start + 1;
            continue;
        }
        out += s.slice(pos, start) + expandReplacement(repl, m[0]);
        count++;
        lastEnd = end;
        if (start === end) {
            if (start < s.length) out += s[start];
            pos = start + 1;
        } else {
            pos = end;
        }
        if (!global) break;
    }
    if (pos < s.length) out += s.slice(pos);
    return { result: out, count };
}
