/**
 * AwkLexer - tokenizer for the awk language (XCU awk, "Lexical Conventions").
 *
 * Newlines are significant tokens (statement terminators); a backslash before
 * a newline continues the line and `#` starts a comment. A `/` starts an ERE
 * token unless the previous token ends an operand, in which case it divides.
 * A name immediately followed by `(` is a FUNC_NAME (user function call).
 */

export type TokenType =
    | 'NEWLINE' | 'EOF' | 'NUMBER' | 'STRING' | 'ERE' | 'NAME' | 'FUNC_NAME' | 'BUILTIN' | 'KEYWORD' | 'PUNCT';

export interface Token {
    type: TokenType;
    /** Operator/keyword text, name, string contents (escapes processed) or ERE source. */
    value: string;
    num?: number;
    line: number;
}

export class AwkSyntaxError extends Error {
    constructor(message: string, readonly line: number) {
        super(message);
    }
}

export const KEYWORDS = new Set([
    'BEGIN', 'END', 'function', 'func', 'if', 'else', 'while', 'for', 'do', 'break', 'continue', 'next', 'nextfile',
    'exit', 'return', 'delete', 'getline', 'print', 'printf', 'in',
]);

export const BUILTINS = new Set([
    'length', 'substr', 'index', 'split', 'sub', 'gsub', 'match', 'sprintf', 'sin', 'cos', 'atan2', 'exp', 'log',
    'sqrt', 'int', 'rand', 'srand', 'tolower', 'toupper', 'system', 'close', 'fflush',
]);

/** Longest first, so that e.g. "**=" wins over "**" and "*". */
const OPERATORS = [
    '**=', '&&', '||', '==', '<=', '>=', '!=', '++', '--', '+=', '-=', '*=', '/=', '%=', '^=', '**', '>>', '!~',
    '{', '}', '(', ')', '[', ']', ';', ',', '+', '-', '*', '/', '%', '^', '!', '>', '<', '|', '?', ':', '~', '$', '=',
];

const ESCAPES: Record<string, string> = {
    '"': '"', '\\': '\\', '/': '/', a: '\x07', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v',
};

/**
 * Processes awk escape sequences in a string (string literals, -v and
 * command-line assignments). Unknown escapes keep their backslash.
 */
export function processEscapes(s: string): string {
    if (!s.includes('\\')) return s;
    let out = '';
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c !== '\\' || i + 1 >= s.length) { out += c; continue; }
        const n = s[++i];
        if (n in ESCAPES) { out += ESCAPES[n]; continue; }
        if (n >= '0' && n <= '7') {
            let oct = n;
            while (oct.length < 3 && s[i + 1] >= '0' && s[i + 1] <= '7') oct += s[++i];
            out += String.fromCharCode(parseInt(oct, 8) & 0xff);
            continue;
        }
        out += '\\' + n;
    }
    return out;
}

const NUMBER_RE = /(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][-+]?[0-9]+)?/y;
const WORD_RE = /[A-Za-z_][A-Za-z0-9_]*/y;

/** Tokens after which `/` is division rather than the start of an ERE. */
function endsOperand(t: Token | undefined): boolean {
    if (!t) return false;
    switch (t.type) {
        case 'NUMBER': case 'STRING': case 'ERE': case 'NAME': case 'BUILTIN': return true;
        case 'KEYWORD': return t.value === 'getline';
        case 'PUNCT': return t.value === ')' || t.value === ']' || t.value === '$' || t.value === '++' || t.value === '--';
        default: return false;
    }
}

export class AwkLexer {
    private pos = 0;
    private line = 1;
    private readonly tokens: Token[] = [];

    constructor(private readonly src: string) { }

    tokenize(): Token[] {
        const s = this.src;
        while (this.pos < s.length) {
            const c = s[this.pos];
            if (c === ' ' || c === '\t' || c === '\r') { this.pos++; continue; }
            if (c === '\\' && s[this.pos + 1] === '\n') { this.pos += 2; this.line++; continue; }
            if (c === '\\' && s[this.pos + 1] === '\r' && s[this.pos + 2] === '\n') { this.pos += 3; this.line++; continue; }
            if (c === '#') {
                while (this.pos < s.length && s[this.pos] !== '\n') this.pos++;
                continue;
            }
            if (c === '\n') { this.push('NEWLINE', '\n'); this.pos++; this.line++; continue; }
            if (c === '"') { this.readString(); continue; }
            if (c === '/' && !endsOperand(this.tokens[this.tokens.length - 1])) { this.readRegex(); continue; }
            if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[this.pos + 1] ?? ''))) { this.readNumber(); continue; }
            if (/[A-Za-z_]/.test(c)) { this.readWord(); continue; }
            const op = OPERATORS.find(o => s.startsWith(o, this.pos));
            if (!op) throw new AwkSyntaxError(`syntax error at source line ${this.line}: unexpected character '${c}'`, this.line);
            this.push('PUNCT', op);
            this.pos += op.length;
        }
        this.push('NEWLINE', '\n');
        this.push('EOF', '');
        return this.tokens;
    }

    private push(type: TokenType, value: string, num?: number): void {
        this.tokens.push({ type, value, num, line: this.line });
    }

    private readString(): void {
        const s = this.src;
        let i = this.pos + 1;
        let raw = '';
        while (i < s.length && s[i] !== '"') {
            if (s[i] === '\n') throw new AwkSyntaxError(`newline in string at source line ${this.line}`, this.line);
            if (s[i] === '\\' && i + 1 < s.length) {
                if (s[i + 1] === '\n') { i += 2; this.line++; continue; }
                raw += s[i] + s[i + 1];
                i += 2;
                continue;
            }
            raw += s[i++];
        }
        if (i >= s.length) throw new AwkSyntaxError(`non-terminated string at source line ${this.line}`, this.line);
        this.push('STRING', processEscapes(raw));
        this.pos = i + 1;
    }

    private readRegex(): void {
        const s = this.src;
        let i = this.pos + 1;
        let raw = '';
        let inBracket = false;
        while (i < s.length) {
            const c = s[i];
            if (c === '\n') throw new AwkSyntaxError(`newline in regex at source line ${this.line}`, this.line);
            if (c === '\\' && i + 1 < s.length) {
                // "\/" is a literal slash; other escapes are left for the regex translator.
                raw += s[i + 1] === '/' ? '/' : c + s[i + 1];
                i += 2;
                continue;
            }
            if (inBracket) {
                if (c === '[' && s[i + 1] === ':') {
                    const end = s.indexOf(':]', i + 2);
                    if (end !== -1 && !s.slice(i, end).includes('\n')) {
                        raw += s.slice(i, end + 2);
                        i = end + 2;
                        continue;
                    }
                }
                if (c === ']') inBracket = false;
            } else if (c === '[') {
                inBracket = true;
                raw += c;
                i++;
                if (s[i] === '^') { raw += '^'; i++; }
                if (s[i] === ']') { raw += ']'; i++; }
                continue;
            } else if (c === '/') {
                break;
            }
            raw += c;
            i++;
        }
        if (i >= s.length) throw new AwkSyntaxError(`non-terminated regular expression at source line ${this.line}`, this.line);
        this.push('ERE', raw);
        this.pos = i + 1;
    }

    private readNumber(): void {
        NUMBER_RE.lastIndex = this.pos;
        const m = NUMBER_RE.exec(this.src)!;
        this.push('NUMBER', m[0], parseFloat(m[0]));
        this.pos += m[0].length;
    }

    private readWord(): void {
        WORD_RE.lastIndex = this.pos;
        const m = WORD_RE.exec(this.src)!;
        const word = m[0];
        this.pos += word.length;
        if (KEYWORDS.has(word)) this.push('KEYWORD', word === 'func' ? 'function' : word);
        else if (BUILTINS.has(word)) this.push('BUILTIN', word);
        else if (this.src[this.pos] === '(') this.push('FUNC_NAME', word);
        else this.push('NAME', word);
    }
}
