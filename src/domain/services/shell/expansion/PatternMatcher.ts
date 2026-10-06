/**
 * PatternMatcher - POSIX pattern matching notation (XCU §2.13).
 *
 * Patterns use `*`, `?` and bracket expressions (`[a-z]`, `[!x]`,
 * `[[:alpha:]]`). A backslash makes the next character literal; the
 * expander uses this to protect characters that were quoted in the source.
 */

const CLASSES: Record<string, string> = {
    alnum: 'A-Za-z0-9', alpha: 'A-Za-z', blank: ' \\t', cntrl: '\\x00-\\x1f\\x7f',
    digit: '0-9', graph: '!-~', lower: 'a-z', print: ' -~', punct: '!-\\/:-@\\[-`{-~',
    space: ' \\t\\n\\r\\f\\v', upper: 'A-Z', xdigit: '0-9A-Fa-f',
};

const escapeRegex = (c: string) => c.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&');

/** True if the pattern contains an unescaped `*`, `?` or `[`. */
export function hasPatternChars(pattern: string): boolean {
    for (let i = 0; i < pattern.length; i++) {
        const c = pattern[i];
        if (c === '\\') { i++; continue; }
        if (c === '*' || c === '?' || c === '[') return true;
    }
    return false;
}

/** Escapes every pattern-special character so the text matches literally. */
export function escapePattern(text: string): string {
    return text.replace(/[\\*?[\]]/g, '\\$&');
}

/** Removes pattern escapes, yielding the literal text. */
export function unescapePattern(pattern: string): string {
    return pattern.replace(/\\(.)/g, '$1');
}

/** Translates a bracket expression starting at `start` ('['); returns [regex, nextIndex] or null. */
function translateBracket(p: string, start: number): [string, number] | null {
    let i = start + 1;
    let negate = false;
    if (p[i] === '!' || p[i] === '^') { negate = true; i++; }
    let body = '';
    let first = true;
    while (i < p.length) {
        const c = p[i];
        if (c === ']' && !first) {
            return [`[${negate ? '^' : ''}${body}]`, i + 1];
        }
        first = false;
        if (c === '[' && p[i + 1] === ':') {
            const end = p.indexOf(':]', i + 2);
            if (end !== -1) {
                const cls = CLASSES[p.substring(i + 2, end)];
                if (cls !== undefined) { body += cls; i = end + 2; continue; }
            }
        }
        if (c === '\\' && i + 1 < p.length) {
            body += escapeRegex(p[i + 1]);
            i += 2;
            continue;
        }
        if (c === '-' && body && p[i + 1] !== ']' && i + 1 < p.length) {
            body += '-';
            i++;
            continue;
        }
        body += escapeRegex(c);
        i++;
    }
    return null; // unterminated: '[' is literal
}

/** Converts a pattern to a regex source (unanchored). */
export function patternToRegexSource(pattern: string, greedy = true): string {
    let out = '';
    for (let i = 0; i < pattern.length; i++) {
        const c = pattern[i];
        if (c === '\\') {
            if (i + 1 < pattern.length) out += escapeRegex(pattern[++i]);
            else out += '\\\\';
        } else if (c === '*') {
            out += greedy ? '[\\s\\S]*' : '[\\s\\S]*?';
        } else if (c === '?') {
            out += '[\\s\\S]';
        } else if (c === '[') {
            const bracket = translateBracket(pattern, i);
            if (bracket) {
                out += bracket[0];
                i = bracket[1] - 1;
            } else {
                out += '\\[';
            }
        } else {
            out += escapeRegex(c);
        }
    }
    return out;
}

const cache = new Map<string, RegExp>();

/** Whole-string match, as used by `case` and pathname expansion. */
export function matchPattern(pattern: string, text: string): boolean {
    let re = cache.get(pattern);
    if (!re) {
        re = new RegExp(`^${patternToRegexSource(pattern)}$`);
        if (cache.size > 500) cache.clear();
        cache.set(pattern, re);
    }
    return re.test(text);
}

/**
 * Prefix/suffix removal for `${p#w}`, `${p##w}`, `${p%w}`, `${p%%w}`.
 * Tries candidate lengths in the order the operator demands.
 */
export function removeAffix(value: string, pattern: string, op: '#' | '##' | '%' | '%%'): string {
    const n = value.length;
    if (op === '#' || op === '##') {
        const order = op === '#' ? range(0, n) : range(n, 0);
        for (const len of order) {
            if (matchPattern(pattern, value.substring(0, len))) return value.substring(len);
        }
    } else {
        const order = op === '%' ? range(n, 0) : range(0, n);
        for (const start of order) {
            if (matchPattern(pattern, value.substring(start))) return value.substring(0, start);
        }
    }
    return value;
}

function range(from: number, to: number): number[] {
    const out: number[] = [];
    if (from <= to) for (let i = from; i <= to; i++) out.push(i);
    else for (let i = from; i >= to; i--) out.push(i);
    return out;
}
