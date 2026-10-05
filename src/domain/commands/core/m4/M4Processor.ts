/**
 * M4Processor - the GNU m4 macro expansion engine (POSIX m4, XCU).
 *
 * Input is a stack of frames (files being read, text pushed back by macro
 * expansions, builtin tokens produced by `defn`). The scanner splits it into
 * tokens under the current quote and comment delimiters; names that are
 * defined macros are called (arguments collected with their own macro calls
 * expanded) and the expansion is pushed back to be rescanned. Everything else
 * goes to the current diversion.
 *
 * All text is handled as byte strings (one char per byte) so that len,
 * substr and index count bytes as m4 does.
 */
import { BUILTINS, BuiltinSpec } from './M4Builtins';
import { Arg, Definition, M4Exit, M4Host, M4Options } from './M4Types';

export { M4Exit } from './M4Types';
export type { Arg, Definition, M4Host, M4Options } from './M4Types';

interface TextFrame { kind: 'text'; s: string; pos: number; file?: { name: string; line: number } }
interface TokenFrame { kind: 'builtin'; name: string; done: boolean }
type Frame = TextFrame | TokenFrame;

type Token =
    | { t: 'eof' }
    | { t: 'word' | 'string' | 'comment' | 'char'; s: string }
    | { t: 'builtin'; name: string };

const BUILTIN_MARK = { builtin: true } as const;
/** Guards against runaway recursion in a simulated machine. */
const MAX_CALLS = 2_000_000;
const MAX_NESTING = 1024;

export class M4Processor {
    private frames: Frame[] = [];
    private symbols = new Map<string, Definition[]>();
    lquote = '`';
    rquote = "'";
    bcomm = '#';
    ecomm = '\n';
    /** Diversion number; 0 is standard output, negative discards. */
    divnum = 0;
    private diversions = new Map<number, string>();
    private out = '';
    private wrapped: string[] = [];
    private errors = 0;
    private calls = 0;
    private nesting = 0;
    private lastFile = { name: '', line: 0 };
    sysval = 0;
    readonly stderr: string[] = [];

    constructor(readonly host: M4Host, readonly options: M4Options = {}) {
        for (const [name, spec] of Object.entries(BUILTINS)) {
            if (options.traditional && spec.gnu) continue;
            this.symbols.set(options.prefixBuiltins ? `m4_${name}` : name, [{ builtin: name }]);
        }
        if (options.traditional) this.define('unix', { text: '' });
        else {
            this.define(options.prefixBuiltins ? 'm4___gnu__' : '__gnu__', { text: '' });
            this.define(options.prefixBuiltins ? 'm4___unix__' : '__unix__', { text: '' });
        }
    }

    // ---- symbol table -------------------------------------------------

    lookup(name: string): Definition | undefined {
        const stack = this.symbols.get(name);
        return stack?.[stack.length - 1];
    }

    names(): string[] {
        return [...this.symbols.keys()].filter(n => this.symbols.get(n)!.length > 0);
    }

    /** define: replaces the topmost definition. */
    define(name: string, def: Definition) {
        const stack = this.symbols.get(name);
        if (stack && stack.length) stack[stack.length - 1] = def;
        else this.symbols.set(name, [def]);
    }

    pushdef(name: string, def: Definition) {
        const stack = this.symbols.get(name);
        if (stack) stack.push(def);
        else this.symbols.set(name, [def]);
    }

    popdef(name: string) {
        const stack = this.symbols.get(name);
        if (stack) { stack.pop(); if (!stack.length) this.symbols.delete(name); }
    }

    undefine(name: string) {
        this.symbols.delete(name);
    }

    /** The builtin spec for a builtin name, honouring -G. */
    builtinSpec(name: string): BuiltinSpec | undefined {
        const spec = BUILTINS[name];
        return spec && !(this.options.traditional && spec.gnu) ? spec : undefined;
    }

    // ---- diagnostics ----------------------------------------------------

    /** "m4:file:line: " location prefix of the innermost file being read. */
    private where(): string {
        const f = this.currentFile();
        return f ? `m4:${f.name}:${f.line}: ` : 'm4: ';
    }

    currentFile(): { name: string; line: number } {
        for (let i = this.frames.length - 1; i >= 0; i--) {
            const fr = this.frames[i];
            if (fr.kind === 'text' && fr.file) return fr.file;
        }
        return this.lastFile;
    }

    /** A warning; with -E it also makes the exit status non-zero. */
    warn(message: string) {
        if (this.options.fatalWarnings) this.errors++;
        if (!this.options.quiet || this.options.fatalWarnings) this.stderr.push(this.where() + message + '\n');
    }

    /**
     * A diagnosed error. GNU m4 only lets some of them (`failing`, e.g. an
     * include that cannot be opened) change the exit status.
     */
    error(message: string, failing = false) {
        if (failing || this.options.fatalWarnings) this.errors++;
        this.stderr.push(this.where() + message + '\n');
    }

    fatal(message: string): never {
        this.stderr.push(this.where() + 'ERROR: ' + message + '\n');
        throw new M4Exit(1);
    }

    /** Appends raw text to standard error (errprint, dumpdef). */
    printErr(text: string) {
        this.stderr.push(text);
    }

    get failed(): boolean {
        return this.errors > 0;
    }

    // ---- output and diversions -------------------------------------------

    write(text: string) {
        if (!text || this.divnum < 0) return;
        if (this.divnum === 0) this.out += text;
        else this.diversions.set(this.divnum, (this.diversions.get(this.divnum) ?? '') + text);
    }

    /** Text bypassing diversions (syscmd output goes straight to stdout). */
    writeStdout(text: string) {
        this.out += text;
    }

    undivert(n: number) {
        if (n === this.divnum || n <= 0) return;
        const text = this.diversions.get(n);
        if (text === undefined) return;
        this.diversions.delete(n);
        this.write(text);
    }

    undivertAll() {
        for (const n of [...this.diversions.keys()].sort((a, b) => a - b)) this.undivert(n);
    }

    get output(): string {
        return this.out;
    }

    wrap(text: string) {
        this.wrapped.push(text);
    }

    // ---- input ------------------------------------------------------------

    pushText(s: string) {
        if (s) this.frames.push({ kind: 'text', s, pos: 0 });
    }

    pushBuiltin(name: string) {
        this.frames.push({ kind: 'builtin', name, done: false });
    }

    pushFile(name: string, data: string) {
        this.frames.push({ kind: 'text', s: data, pos: 0, file: { name, line: 1 } });
    }

    private top(): Frame | null {
        while (this.frames.length) {
            const f = this.frames[this.frames.length - 1];
            if (f.kind === 'text' ? f.pos < f.s.length : !f.done) return f;
            if (f.kind === 'text' && f.file) this.lastFile = f.file;
            this.frames.pop();
        }
        return null;
    }

    /** Next input character without consuming it; BUILTIN_MARK for a builtin token, null at EOF. */
    private peek(): string | typeof BUILTIN_MARK | null {
        const f = this.top();
        if (!f) return null;
        return f.kind === 'text' ? f.s[f.pos] : BUILTIN_MARK;
    }

    peekChar(): string | null {
        const c = this.peek();
        return typeof c === 'string' ? c : null;
    }

    /** Consumes one character (or builtin token, returned as null). */
    readChar(): string | null {
        const f = this.top();
        if (!f) return null;
        if (f.kind === 'builtin') { f.done = true; return null; }
        const c = f.s[f.pos++];
        if (c === '\n' && f.file) f.file.line++;
        return c;
    }

    /** Whether the upcoming input starts with `str` (may span frames). */
    private lookingAt(str: string): boolean {
        if (!str) return false;
        let k = 0;
        for (let i = this.frames.length - 1; i >= 0 && k < str.length; i--) {
            const f = this.frames[i];
            if (f.kind === 'builtin') { if (f.done) continue; return false; }
            for (let p = f.pos; p < f.s.length && k < str.length; p++, k++) if (f.s[p] !== str[k]) return false;
        }
        return k === str.length;
    }

    private skip(n: number) {
        for (let i = 0; i < n; i++) this.readChar();
    }

    /** True when at EOF of all input. */
    atEof(): boolean {
        return this.peek() === null;
    }

    private nextToken(): Token {
        const c = this.peek();
        if (c === null) return { t: 'eof' };
        if (c === BUILTIN_MARK) {
            const f = this.top() as TokenFrame;
            f.done = true;
            return { t: 'builtin', name: f.name };
        }
        if (this.bcomm && this.lookingAt(this.bcomm)) {
            this.skip(this.bcomm.length);
            let s = this.bcomm;
            for (;;) {
                if (this.lookingAt(this.ecomm)) { this.skip(this.ecomm.length); return { t: 'comment', s: s + this.ecomm }; }
                if (this.atEof()) this.fatal('end of file in comment');
                const ch = this.readChar();
                if (ch !== null) s += ch;
            }
        }
        if (typeof c === 'string' && /[A-Za-z_]/.test(c)) {
            let s = '';
            for (let ch = this.peekChar(); ch !== null && /[A-Za-z0-9_]/.test(ch); ch = this.peekChar()) s += this.readChar();
            return { t: 'word', s };
        }
        if (this.lquote && this.lookingAt(this.lquote)) {
            this.skip(this.lquote.length);
            let depth = 1;
            let s = '';
            for (;;) {
                if (this.lookingAt(this.rquote)) {
                    this.skip(this.rquote.length);
                    if (--depth === 0) return { t: 'string', s };
                    s += this.rquote;
                } else if (this.lookingAt(this.lquote)) {
                    this.skip(this.lquote.length);
                    depth++;
                    s += this.lquote;
                } else {
                    if (this.atEof()) this.fatal('end of file in string');
                    const ch = this.readChar();
                    if (ch !== null) s += ch;
                }
            }
        }
        return { t: 'char', s: this.readChar()! };
    }

    // ---- expansion -----------------------------------------------------------

    /** Expands everything on the input stack, writing to the current diversion. */
    async expandInput() {
        for (let tok = this.nextToken(); tok.t !== 'eof'; tok = this.nextToken()) {
            if (tok.t === 'builtin') continue;
            if (tok.t === 'word' && await this.maybeCall(tok.s)) continue;
            this.write(tok.s);
        }
    }

    /** Reads and processes one input file. */
    async processFile(name: string, data: string) {
        if (this.options.syncLines) this.write(`#line 1 "${name}"\n`);
        this.pushFile(name, data);
        await this.expandInput();
    }

    /** End of input: m4wrap text, then the diversions in order. */
    async finish() {
        while (this.wrapped.length) {
            const text = this.wrapped.reverse().join('');
            this.wrapped = [];
            this.pushText(text);
            await this.expandInput();
        }
        this.divnum = 0;
        this.undivertAll();
    }

    /** Calls `name` if it is a macro that applies here; returns false when it is plain text. */
    private async maybeCall(name: string): Promise<boolean> {
        const def = this.lookup(name);
        if (!def) return false;
        const hasArgs = this.peekChar() === '(';
        if ('builtin' in def && !hasArgs && this.builtinSpec(def.builtin)?.blind) return false;
        if (++this.calls > MAX_CALLS) this.fatal('expansion limit exceeded (infinite recursion?)');
        const args = hasArgs ? await this.collectArgs(name) : [{ text: name }];
        await this.invoke(def, args);
        return true;
    }

    /** Runs a definition with collected arguments (args[0] is the macro name). */
    async invoke(def: Definition, args: Arg[]) {
        if ('text' in def) this.pushText(this.expandBody(def.text, args));
        else await this.builtinSpec(def.builtin)!.run(this, args);
    }

    private async collectArgs(name: string): Promise<Arg[]> {
        if (++this.nesting > MAX_NESTING) this.fatal(`recursion limit of ${MAX_NESTING} exceeded, use -L<N> to change it`);
        this.readChar(); // '('
        const args: Arg[] = [{ text: name }];
        try {
            for (;;) {
                let tok = this.nextToken();
                while (tok.t === 'char' && /\s/.test(tok.s)) tok = this.nextToken();
                const arg: Arg = { text: '' };
                let depth = 0;
                for (;; tok = this.nextToken()) {
                    if (tok.t === 'eof') this.fatal('end of file in argument list');
                    if (tok.t === 'builtin') {
                        if (!arg.text && !arg.builtin) arg.builtin = tok.name;
                        continue;
                    }
                    if (tok.t === 'word' && await this.maybeCall(tok.s)) continue;
                    if (tok.t === 'char') {
                        if (tok.s === '(') depth++;
                        else if (tok.s === ')') {
                            if (depth === 0) { args.push(this.finishArg(arg)); return args; }
                            depth--;
                        } else if (tok.s === ',' && depth === 0) {
                            args.push(this.finishArg(arg));
                            break;
                        }
                    }
                    arg.text += tok.s;
                }
            }
        } finally {
            this.nesting--;
        }
    }

    private finishArg(arg: Arg): Arg {
        return arg.builtin && arg.text ? { text: arg.text } : arg;
    }

    /** Substitutes $0..$N, $#, $* and $@ in a user macro's body. */
    private expandBody(text: string, args: Arg[]): string {
        if (!text.includes('$')) return text;
        let out = '';
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (c !== '$' || i + 1 >= text.length) { out += c; continue; }
            const n = text[i + 1];
            if (/[0-9]/.test(n)) {
                let j = i + 1;
                if (this.options.traditional) j++;
                else while (j < text.length && /[0-9]/.test(text[j])) j++;
                out += args[parseInt(text.substring(i + 1, j), 10)]?.text ?? '';
                i = j - 1;
            } else if (n === '#') {
                out += String(args.length - 1); i++;
            } else if (n === '*' || n === '@') {
                const q = n === '@';
                out += args.slice(1).map(a => (q ? this.quote(a.text) : a.text)).join(',');
                i++;
            } else out += c;
        }
        return out;
    }

    quote(text: string): string {
        return this.lquote + text + this.rquote;
    }

    /** Reads and discards input through the next newline (dnl). */
    discardLine() {
        for (;;) {
            if (this.atEof()) { this.warn('Warning: end of file treated as newline'); return; }
            if (this.readChar() === '\n') return;
        }
    }
}
