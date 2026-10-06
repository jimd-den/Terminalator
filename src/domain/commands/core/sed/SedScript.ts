/**
 * SedScript - parser for the sed command language (POSIX XCU sed, plus the
 * GNU extensions scripts commonly use: -E, I flag, 0~step / addr,+N,
 * one-line a/i/c, Q, T, F, z, l n, M flag, \L\U\l\u\E in replacements).
 */
import { compilePosixRegex } from '../../../utils/PosixRegex';

export class SedSyntaxError extends Error { }

export type Address =
    | { kind: 'line'; n: number }
    | { kind: 'last' }
    | { kind: 'regex'; re: RegExp | null } // null = last regex used
    | { kind: 'step'; first: number; step: number }
    | { kind: 'zero' }; // 0,/re/

export type Addr2 = Address | { kind: 'plus'; n: number } | { kind: 'multiple'; n: number };

export interface SedCommand {
    name: string;
    a1?: Address;
    a2?: Addr2;
    negate: boolean;
    /** a/i/c text, r/R/w/W file, b/t/T label, : label */
    text?: string;
    /** q/Q exit code, l line length */
    num?: number;
    /** s command */
    re?: RegExp | null;
    replacement?: Replacement[];
    global?: boolean;
    occurrence?: number;
    print?: number; // count of p flags
    wfile?: string;
    /** y command */
    from?: string;
    to?: string;
    /** { block: index of matching } ; } : index of opening { */
    jump?: number;
    /** range bookkeeping (per command instance) */
    rangeActive?: boolean;
    rangeEnd?: number;
}

export type Replacement =
    | { kind: 'lit'; text: string }
    | { kind: 'group'; n: number } // 0 = whole match (&)
    | { kind: 'case'; mode: 'L' | 'U' | 'l' | 'u' | 'E' };

export interface ParseOptions {
    extended: boolean;
}

export class SedParser {
    private s = '';
    private i = 0;
    private cmds: SedCommand[] = [];
    private blocks: number[] = [];

    constructor(private opts: ParseOptions) { }

    parse(script: string): SedCommand[] {
        this.s = script;
        this.i = 0;
        this.cmds = [];
        this.blocks = [];
        while (true) {
            this.skip(/[\s;]/);
            if (this.i >= this.s.length) break;
            if (this.s[this.i] === '#') { this.skipLine(); continue; }
            this.parseCommand();
        }
        if (this.blocks.length) this.fail("unmatched `{'");
        return this.cmds;
    }

    private fail(msg: string): never {
        throw new SedSyntaxError(`-e expression #1, char ${this.i}: ${msg}`);
    }

    private peek(): string { return this.s[this.i] ?? ''; }

    private skip(re: RegExp) {
        while (this.i < this.s.length && re.test(this.s[this.i])) this.i++;
    }

    private skipBlanks() { this.skip(/[ \t]/); }

    private skipLine() {
        while (this.i < this.s.length && this.s[this.i] !== '\n') this.i++;
    }

    private number(): number | null {
        const m = /^[0-9]+/.exec(this.s.substring(this.i));
        if (!m) return null;
        this.i += m[0].length;
        return parseInt(m[0], 10);
    }

    /** Reads a delimited regex/replacement part, handling \delim and \n. */
    private delimited(delim: string, isRegex: boolean): string {
        let out = '';
        while (this.i < this.s.length) {
            const c = this.s[this.i];
            if (c === '\\') {
                const n = this.s[this.i + 1];
                if (n === delim) out += delim === '&' && !isRegex ? '\\&' : delim;
                else if (n === 'n' && isRegex) out += '\\n';
                else if (n === '\n') out += isRegex ? '\\n' : '\n';
                else out += c + (n ?? '');
                this.i += 2;
                continue;
            }
            if (c === '[' && isRegex) {
                // Bracket expressions may contain the delimiter unescaped.
                let j = this.i + 1;
                if (this.s[j] === '^') j++;
                if (this.s[j] === ']') j++;
                while (j < this.s.length && this.s[j] !== ']') {
                    if (this.s[j] === '[' && /[:.=]/.test(this.s[j + 1] ?? '')) {
                        const end = this.s.indexOf(this.s[j + 1] + ']', j + 2);
                        j = end === -1 ? j + 1 : end + 2;
                        continue;
                    }
                    j++;
                }
                out += this.s.substring(this.i, j + 1);
                this.i = j + 1;
                continue;
            }
            if (c === delim) { this.i++; return out; }
            if (c === '\n' && isRegex) this.fail(`unterminated address regex`);
            out += c;
            this.i++;
        }
        this.fail(`unterminated \`s' command`);
    }

    private compile(src: string, flags: string): RegExp | null {
        if (src === '') return null;
        try {
            return compilePosixRegex(src, {
                extended: this.opts.extended,
                ignoreCase: flags.includes('I'),
                global: true,
                multiline: flags.includes('M'),
            });
        } catch (e: any) {
            this.fail(`invalid regex: ${e.message}`);
        }
    }

    private address(): Address | null {
        const c = this.peek();
        if (c === '$') { this.i++; return { kind: 'last' }; }
        if (/[0-9]/.test(c)) {
            const n = this.number()!;
            if (this.peek() === '~') {
                this.i++;
                const step = this.number() ?? 0;
                return { kind: 'step', first: n, step };
            }
            return n === 0 ? { kind: 'zero' } : { kind: 'line', n };
        }
        if (c === '/' || c === '\\') {
            let delim = '/';
            if (c === '\\') { this.i++; delim = this.peek(); }
            this.i++;
            const src = this.delimited(delim, true);
            let flags = '';
            while (/[IM]/.test(this.peek())) flags += this.s[this.i++];
            return { kind: 'regex', re: this.compile(src, flags) };
        }
        return null;
    }

    /** Text argument of a, i, c: POSIX `a\<newline>text` or GNU `a text`. */
    private textArg(): string {
        this.skipBlanks();
        if (this.peek() === '\\') {
            this.i++;
            this.skipBlanks();
            if (this.peek() === '\n') this.i++;
        }
        let out = '';
        while (this.i < this.s.length) {
            const c = this.s[this.i];
            if (c === '\\') {
                const n = this.s[this.i + 1];
                if (n === '\n') { out += '\n'; this.i += 2; continue; }
                out += n ?? '';
                this.i += 2;
                continue;
            }
            if (c === '\n') { this.i++; break; }
            out += c;
            this.i++;
        }
        return out;
    }

    private label(): string {
        this.skipBlanks();
        const start = this.i;
        while (this.i < this.s.length && !/[;\n]/.test(this.s[this.i])) this.i++;
        return this.s.substring(start, this.i).trim();
    }

    private filename(): string {
        this.skipBlanks();
        const start = this.i;
        this.skipLine();
        return this.s.substring(start, this.i);
    }

    private parseReplacement(src: string): Replacement[] {
        const out: Replacement[] = [];
        let lit = '';
        const flush = () => { if (lit) out.push({ kind: 'lit', text: lit }); lit = ''; };
        for (let k = 0; k < src.length; k++) {
            const c = src[k];
            if (c === '&') { flush(); out.push({ kind: 'group', n: 0 }); continue; }
            if (c !== '\\') { lit += c; continue; }
            const n = src[++k];
            if (n === undefined) { lit += '\\'; break; }
            if (/[0-9]/.test(n)) { flush(); out.push({ kind: 'group', n: parseInt(n, 10) }); continue; }
            if ('LUluE'.includes(n)) { flush(); out.push({ kind: 'case', mode: n as 'L' }); continue; }
            if (n === 'n') { lit += '\n'; continue; }
            if (n === 't') { lit += '\t'; continue; }
            if (n === '&') { lit += '&'; continue; }
            lit += n;
        }
        flush();
        return out;
    }

    private yString(src: string): string {
        return src.replace(/\\(.)/g, (_, c) => (c === 'n' ? '\n' : c === 't' ? '\t' : c));
    }

    private parseCommand() {
        const cmd: SedCommand = { name: '', negate: false };
        const a1 = this.address();
        if (a1) {
            cmd.a1 = a1;
            this.skipBlanks();
            if (this.peek() === ',') {
                this.i++;
                this.skipBlanks();
                if (this.peek() === '+' || this.peek() === '~') {
                    const kind = this.s[this.i++] === '+' ? 'plus' : 'multiple';
                    cmd.a2 = { kind, n: this.number() ?? 0 };
                } else {
                    const a2 = this.address();
                    if (!a2) this.fail('unexpected `,\'');
                    cmd.a2 = a2;
                }
            }
        }
        this.skipBlanks();
        while (this.peek() === '!') { cmd.negate = !cmd.negate; this.i++; this.skipBlanks(); }
        const name = this.s[this.i++];
        if (name === undefined) this.fail('missing command');
        cmd.name = name;

        switch (name) {
            case '{':
                this.blocks.push(this.cmds.length);
                break;
            case '}': {
                if (cmd.a1) this.fail('} doesn\'t want any addresses');
                const open = this.blocks.pop();
                if (open === undefined) this.fail("unexpected `}'");
                this.cmds[open].jump = this.cmds.length + 1;
                break;
            }
            case 'a': case 'i': case 'c':
                cmd.text = this.textArg();
                break;
            case ':':
                if (cmd.a1) this.fail(': doesn\'t want any addresses');
                cmd.text = this.label();
                if (!cmd.text) this.fail('":" lacks a label');
                break;
            case 'b': case 't': case 'T':
                cmd.text = this.label();
                break;
            case 'r': case 'R': case 'w': case 'W':
                cmd.text = this.filename();
                break;
            case 'q': case 'Q': case 'l': case 'L': {
                this.skipBlanks();
                const n = this.number();
                if (n !== null) cmd.num = n;
                break;
            }
            case 's': {
                const delim = this.s[this.i++];
                if (!delim || delim === '\n' || delim === '\\') this.fail('unterminated `s\' command');
                const re = this.delimited(delim, true);
                const repl = this.delimited(delim, false);
                let flags = '';
                cmd.print = 0;
                while (this.i < this.s.length) {
                    const f = this.peek();
                    if (f === 'g') { cmd.global = true; this.i++; }
                    else if (f === 'p') { cmd.print!++; this.i++; }
                    else if (f === 'i' || f === 'I') { flags += 'I'; this.i++; }
                    else if (f === 'm' || f === 'M') { flags += 'M'; this.i++; }
                    else if (f === 'e') { this.i++; }
                    else if (/[0-9]/.test(f)) {
                        const n = this.number()!;
                        if (n === 0) this.fail('number option to `s\' command may not be zero');
                        cmd.occurrence = n;
                    }
                    else if (f === 'w') { this.i++; cmd.wfile = this.filename(); break; }
                    else break;
                }
                cmd.re = this.compile(re, flags);
                cmd.replacement = this.parseReplacement(repl);
                break;
            }
            case 'y': {
                const delim = this.s[this.i++];
                const from = this.yString(this.delimited(delim, false));
                const to = this.yString(this.delimited(delim, false));
                if ([...from].length !== [...to].length) this.fail('strings for `y\' command are different lengths');
                cmd.from = from;
                cmd.to = to;
                break;
            }
            case '=': case 'd': case 'D': case 'g': case 'G': case 'h': case 'H': case 'n': case 'N':
            case 'p': case 'P': case 'x': case 'z': case 'F': case 'e':
                break;
            case '#':
                this.skipLine();
                return;
            default:
                this.i--;
                this.fail(`unknown command: \`${name}'`);
        }
        this.cmds.push(cmd);
        this.skipBlanks();
        if (this.peek() === '}' ) return;
        if (name !== '{' && this.i < this.s.length && !/[;\n#]/.test(this.peek()) && !'aicrRwWbtT:'.includes(name)) {
            this.fail(`extra characters after command`);
        }
    }
}
