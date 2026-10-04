/**
 * PosixRegex - translate POSIX Basic/Extended Regular Expressions (XBD §9)
 * into JavaScript RegExp source.
 *
 * BRE: \( \) groups, \{m,n\} intervals, * , \1-\9 backreferences; the GNU
 *      extensions \+ \? \| are accepted. + ? | ( ) { } are literal.
 * ERE: ( ) | + ? {m,n} are operators.
 * Both: bracket expressions with [:class:], anchors ^ $, `.`.
 */

const CLASSES: Record<string, string> = {
    alnum: 'A-Za-z0-9', alpha: 'A-Za-z', blank: ' \\t', cntrl: '\\x00-\\x1f\\x7f', digit: '0-9',
    graph: '!-~', lower: 'a-z', print: ' -~', punct: '!-\\/:-@\\[-`{-~', space: ' \\t\\n\\r\\f\\v',
    upper: 'A-Z', xdigit: '0-9A-Fa-f',
};

const JS_SPECIAL = /[\\^$.*+?()[\]{}|\/]/;
const lit = (c: string) => (JS_SPECIAL.test(c) ? '\\' + c : c);

export class RegexSyntaxError extends Error { }

/** Parses a bracket expression at p[i] === '['; returns [jsSource, nextIndex]. */
function bracket(p: string, i: number): [string, number] {
    let j = i + 1;
    let negate = false;
    if (p[j] === '^') { negate = true; j++; }
    let body = '';
    let first = true;
    while (j < p.length) {
        const c = p[j];
        if (c === ']' && !first) return [`[${negate ? '^' : ''}${body}]`, j + 1];
        first = false;
        if (c === '[' && (p[j + 1] === ':' || p[j + 1] === '=' || p[j + 1] === '.')) {
            const kind = p[j + 1];
            const end = p.indexOf(kind + ']', j + 2);
            if (end !== -1) {
                const name = p.substring(j + 2, end);
                if (kind === ':') {
                    if (!(name in CLASSES)) throw new RegexSyntaxError(`invalid character class '${name}'`);
                    body += CLASSES[name];
                } else {
                    body += name.split('').map(ch => (/[\]\\^-]/.test(ch) ? '\\' + ch : ch)).join('');
                }
                j = end + 2;
                continue;
            }
        }
        if (c === '-' && body !== '' && p[j + 1] !== ']' && j + 1 < p.length) { body += '-'; j++; continue; }
        body += /[\]\\^\-\[]/.test(c) ? '\\' + c : c;
        j++;
    }
    throw new RegexSyntaxError('unterminated [');
}

export function posixToJsSource(pattern: string, extended: boolean): string {
    let out = '';
    let groups = 0;
    // Positions where '*' is literal in a BRE: start, after '\(' , after '^', after '\|'.
    let atStart = true;

    for (let i = 0; i < pattern.length; i++) {
        const c = pattern[i];
        const startHere = atStart;
        atStart = false;

        if (c === '[') {
            const [src, next] = bracket(pattern, i);
            out += src;
            i = next - 1;
            continue;
        }
        if (c === '\\') {
            const n = pattern[++i];
            if (n === undefined) throw new RegexSyntaxError('trailing backslash');
            if (!extended) {
                if (n === '(') { out += '('; groups++; atStart = true; continue; }
                if (n === ')') { out += ')'; continue; }
                if (n === '{') {
                    const end = pattern.indexOf('\\}', i);
                    if (end === -1) throw new RegexSyntaxError('unterminated \\{');
                    out += `{${pattern.substring(i + 1, end)}}`;
                    i = end + 1;
                    continue;
                }
                if (n === '|') { out += '|'; atStart = true; continue; }
                if (n === '+' || n === '?') { out += n; continue; }
            }
            if (/[1-9]/.test(n)) { out += '\\' + n; continue; }
            if (n === 'n') { out += '\\n'; continue; }
            if (n === 't') { out += '\\t'; continue; }
            if (n === 'w' || n === 'W' || n === 's' || n === 'S' || n === 'b' || n === 'B') { out += '\\' + n; continue; }
            if (n === '<' || n === '>') { out += '\\b'; continue; }
            out += lit(n);
            continue;
        }
        if (c === '^') {
            if (extended || startHere) { out += '^'; atStart = !extended; continue; }
            out += '\\^';
            continue;
        }
        if (c === '$') {
            const atEnd = i === pattern.length - 1 || (!extended && pattern.startsWith('\\)', i + 1)) || (!extended && pattern.startsWith('\\|', i + 1));
            out += extended || atEnd ? '$' : '\\$';
            continue;
        }
        if (c === '*') {
            out += startHere && !extended ? '\\*' : '*';
            continue;
        }
        if (c === '.') { out += '.'; continue; }
        if (extended) {
            if (c === '(') { out += '('; groups++; continue; }
            if (c === ')' || c === '|' || c === '+' || c === '?') { out += c; continue; }
            if (c === '{') {
                const end = pattern.indexOf('}', i);
                if (end !== -1 && /^[0-9]*(,[0-9]*)?$/.test(pattern.substring(i + 1, end))) {
                    out += pattern.substring(i, end + 1);
                    i = end;
                    continue;
                }
                out += '\\{';
                continue;
            }
        }
        out += lit(c);
    }
    void groups;
    return out;
}

export function compilePosixRegex(pattern: string, opts: { extended?: boolean; ignoreCase?: boolean; global?: boolean; multiline?: boolean } = {}): RegExp {
    const flags = (opts.ignoreCase ? 'i' : '') + (opts.global ? 'g' : '') + (opts.multiline ? 'm' : '');
    try {
        return new RegExp(posixToJsSource(pattern, !!opts.extended), flags);
    } catch (e: any) {
        if (e instanceof RegexSyntaxError) throw e;
        throw new RegexSyntaxError(e.message);
    }
}
