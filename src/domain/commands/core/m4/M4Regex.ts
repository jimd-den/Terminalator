/**
 * M4Regex - GNU m4 regular expressions (`regexp`, `patsubst`).
 *
 * GNU m4 compiles patterns with the GNU Emacs syntax: `\(` `\)` group,
 * `\|` alternates, `*` `+` `?` are postfix operators (literal at the start
 * of an expression), `{` `}` `(` `)` `|` are ordinary characters, and
 * `\w \W \< \> \b \B \` \'` are the GNU word/buffer anchors.
 * Replacements use `\&` (or the obsolescent `\0`) and `\1`..`\9`.
 */

const CLASSES: Record<string, string> = {
    alnum: 'A-Za-z0-9', alpha: 'A-Za-z', blank: ' \\t', cntrl: '\\x00-\\x1f\\x7f', digit: '0-9',
    graph: '!-~', lower: 'a-z', print: ' -~', punct: '!-\\/:-@\\[-`{-~', space: ' \\t\\n\\r\\f\\v',
    upper: 'A-Z', xdigit: '0-9A-Fa-f',
};

const escapeJs = (c: string) => (/[\\^$.*+?()[\]{}|\/-]/.test(c) ? '\\' + c : c);

/** Translates a bracket expression starting at p[i] === '['. */
function bracket(p: string, i: number): [string, number] {
    let j = i + 1;
    let out = '[';
    if (p[j] === '^') { out += '^'; j++; }
    let first = true;
    while (j < p.length) {
        const c = p[j];
        if (c === ']' && !first) return [out + ']', j + 1];
        first = false;
        if (c === '[' && p[j + 1] === ':') {
            const end = p.indexOf(':]', j + 2);
            const name = end === -1 ? '' : p.substring(j + 2, end);
            if (!(name in CLASSES)) throw new Error('Invalid character class name');
            out += CLASSES[name];
            j = end + 2;
            continue;
        }
        out += c === '-' ? '-' : escapeJs(c);
        j++;
    }
    throw new Error('Unmatched [, [^, [:, [., or [=');
}

/** Converts a GNU m4 (Emacs-syntax) regular expression into a JavaScript RegExp. */
export function compileM4Regex(pattern: string): RegExp {
    let out = '';
    let groups = 0;
    let open = 0;
    let atStart = true; // at the start of a (sub)expression: operators are literal
    for (let i = 0; i < pattern.length; i++) {
        const c = pattern[i];
        if (c === '\\') {
            const n = pattern[++i];
            if (n === undefined) throw new Error('Trailing backslash');
            switch (n) {
                case '(': out += '('; groups++; open++; atStart = true; continue;
                case ')':
                    if (open === 0) throw new Error('Unmatched ) or \\)');
                    out += ')'; open--; atStart = false; continue;
                case '|': out += '|'; atStart = true; continue;
                case 'w': out += '[A-Za-z0-9_]'; break;
                case 'W': out += '[^A-Za-z0-9_]'; break;
                case '<': out += '\\b(?=[A-Za-z0-9_])'; break;
                case '>': out += '\\b(?<=[A-Za-z0-9_])'; break;
                case 'b': out += '\\b'; break;
                case 'B': out += '\\B'; break;
                case '`': out += '^'; break;
                case "'": out += '$'; break;
                default:
                    if (/[1-9]/.test(n)) {
                        if (Number(n) > groups) throw new Error('Invalid back reference');
                        out += '\\' + n;
                    } else out += escapeJs(n);
            }
            atStart = false;
            continue;
        }
        if (c === '[') {
            const [src, next] = bracket(pattern, i);
            out += src;
            i = next - 1;
            atStart = false;
            continue;
        }
        if (c === '*' || c === '+' || c === '?') {
            if (atStart) { out += '\\' + c; atStart = false; continue; }
            // Repeated operators (a**) collapse into one.
            if (/[*+?]$/.test(out) && !/\\[*+?]$/.test(out)) continue;
            out += c;
            continue;
        }
        if (c === '^') {
            out += atStart ? '^' : '\\^';
            continue;
        }
        if (c === '$') {
            const rest = pattern.substring(i + 1);
            out += rest === '' || rest.startsWith('\\)') || rest.startsWith('\\|') ? '$' : '\\$';
            atStart = false;
            continue;
        }
        out += c === '.' ? '.' : escapeJs(c);
        atStart = false;
    }
    if (open > 0) throw new Error('Unmatched ( or \\(');
    return new RegExp(out, 'g');
}

/**
 * Expands a replacement template for one match.
 * Returns the text; `warn` receives diagnostics such as missing sub-expressions.
 */
export function substituteMatch(repl: string, match: RegExpExecArray, warn: (msg: string) => void): string {
    let out = '';
    for (let i = 0; i < repl.length; i++) {
        const c = repl[i];
        if (c !== '\\') { out += c; continue; }
        const n = repl[++i];
        if (n === undefined) { warn('Warning: trailing \\ ignored in replacement'); break; }
        if (n === '&' || n === '0') { out += match[0]; continue; }
        if (/[1-9]/.test(n)) {
            const k = Number(n);
            if (k >= match.length) warn(`Warning: sub-expression ${k} not present`);
            else out += match[k] ?? '';
            continue;
        }
        out += n;
    }
    return out;
}
