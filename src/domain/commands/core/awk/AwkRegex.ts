/**
 * AwkRegex - awk EREs (XCU awk "Regular Expressions") compiled to JavaScript.
 *
 * awk EREs are POSIX EREs plus the awk escape sequences (\n, \t, \/, \"
 * \ddd ...), which are resolved here before the ERE is translated by
 * utils/PosixRegex. In awk `.` also matches a newline.
 */
import { posixToJsSource, RegexSyntaxError } from '../../../utils/PosixRegex';

const ESCAPES: Record<string, string> = {
    n: '\n', t: '\t', r: '\r', f: '\f', v: '\v', a: '\x07', b: '\b', '/': '/', '"': '"',
};
const ERE_SPECIAL = /[\\^$.[\]|()*+?{}]/;

/** Resolves awk escape sequences in an ERE, keeping ERE operators escaped. */
export function resolveAwkEscapes(src: string): string {
    if (!src.includes('\\')) return src;
    let out = '';
    let inBracket = false;
    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (c === '[' && !inBracket) {
            inBracket = true;
            out += c;
            if (src[i + 1] === '^') out += src[++i];
            if (src[i + 1] === ']') out += src[++i];
            continue;
        }
        if (c === ']' && inBracket) { inBracket = false; out += c; continue; }
        if (c === '[' && inBracket && src[i + 1] === ':') {
            const end = src.indexOf(':]', i + 2);
            if (end !== -1) { out += src.slice(i, end + 2); i = end + 1; continue; }
        }
        if (c !== '\\' || i + 1 >= src.length) { out += c; continue; }
        const n = src[++i];
        let lit: string | undefined = ESCAPES[n];
        if (lit === undefined && n >= '0' && n <= '7') {
            let oct = n;
            while (oct.length < 3 && src[i + 1] >= '0' && src[i + 1] <= '7') oct += src[++i];
            lit = String.fromCharCode(parseInt(oct, 8) & 0xff);
        }
        if (inBracket) {
            // Inside brackets a backslash escapes the next character.
            if (lit !== undefined) out += lit;
            else if (n === ']' || n === '-' || n === '^' || n === '\\') out += n === '\\' ? '\\' : n;
            else out += n;
            continue;
        }
        if (lit === undefined) out += '\\' + n;
        else out += ERE_SPECIAL.test(lit) ? '\\' + lit : lit;
    }
    return out;
}

export interface CompiledRegex {
    /** Non-global: test()/exec() from the start. */
    re: RegExp;
    /** Global: exec() with lastIndex for gsub/split scanning. */
    global: RegExp;
}

/** Compiles awk EREs, caching by source. */
export class AwkRegexCache {
    private readonly cache = new Map<string, CompiledRegex>();

    get(source: string): CompiledRegex {
        let c = this.cache.get(source);
        if (!c) {
            let js: string;
            try {
                js = posixToJsSource(resolveAwkEscapes(source), true);
                c = { re: new RegExp(js, 's'), global: new RegExp(js, 'gs') };
            } catch (e: any) {
                const msg = e instanceof RegexSyntaxError ? e.message : 'invalid regular expression';
                throw new RegexSyntaxError(`regular expression /${source}/: ${msg}`);
            }
            if (this.cache.size > 500) this.cache.clear();
            this.cache.set(source, c);
        }
        return c;
    }
}
