/**
 * AwkInterpreter - executes a parsed awk program (XCU awk "Overall Program
 * Structure", "Expressions", "Variables and Special Variables", "Patterns",
 * "Actions", "Functions").
 *
 * Execution: BEGIN actions; then each record of the input files named by
 * ARGV[1..ARGC-1] (var=value operands are assigned when reached; standard
 * input if there are no file operands) is matched against the rules; then
 * END actions. Input is read only if there are rules or END actions.
 *
 * Variables are untyped until first use as a scalar or an array. Function
 * parameters are local; scalars are passed by value and arrays by reference
 * (an untyped argument becomes the caller's array when the callee uses it
 * as one).
 */
import { Expr, FunctionDef, LValue, NameRef, Program, Stmt } from './AwkAst';
import {
    Cell, NUM, UNINIT_CELL, EMPTY_STR, ZERO, ONE, num, str, bool, strnum,
    toNumber, toBool, isNumeric, numberToString,
} from './AwkValue';
import { awkSprintf } from './AwkFormat';
import { AwkHost } from './AwkHost';
import { AwkExit, AwkNext, AwkNextFile, AwkRuntimeError } from './AwkErrors';
import { AwkRegexCache } from './AwkRegex';
import { RecordReader, splitFields } from './AwkRecords';
import { AwkStreams } from './AwkStreams';
import { processEscapes } from './AwkLexer';
import * as S from './AwkStrings';

const UNTYPED = 0;
const SCALAR = 1;
const ARRAY = 2;

type AwkArray = Map<string, Cell>;

interface Var {
    kind: typeof UNTYPED | typeof SCALAR | typeof ARRAY;
    cell: Cell;
    arr: AwkArray | null;
    /** For an untyped argument: the caller's variable, which becomes the same array. */
    link?: Var;
    /** Special variable name, when assignments have side effects. */
    special?: string;
}

/** Statement completion (break/continue/return without exceptions). */
const NORMAL = 0;
const BREAK = 1;
const CONTINUE = 2;
const RETURN = 3;
type Completion = typeof NORMAL | typeof BREAK | typeof CONTINUE | typeof RETURN;

const SPECIALS = ['NF', 'NR', 'FNR', 'FS', 'OFS', 'ORS', 'RS', 'FILENAME', 'SUBSEP', 'CONVFMT', 'OFMT', 'RSTART', 'RLENGTH'];
const MAX_CALL_DEPTH = 1000;
const ASSIGNMENT_OPERAND = /^[A-Za-z_][A-Za-z0-9_]*=/;

export interface AwkOptions {
    /** ARGV[0] and the operands (files and var=value assignments). */
    argv: string[];
    /** -v assignments, in order (values are escape-processed here). */
    assignments: [string, string][];
    /** -F value (escape-processed by the caller). */
    fs?: string;
}

export class AwkInterpreter {
    private readonly globals = new Map<string, Var>();
    private frame: Var[] = [];
    private depth = 0;
    private returnValue: Cell = UNINIT_CELL;
    private readonly regexes = new AwkRegexCache();
    private readonly streams: AwkStreams;
    private readonly format = (fmt: string, n: number) => awkSprintf(fmt, [num(n)], c => this.str(c));

    // Cached special variables.
    private convfmt = '%.6g';
    private ofmt = '%.6g';
    private subsep = '\x1c';
    private fs = ' ';
    private ofs = ' ';
    private ors = '\n';
    private rs = '\n';

    // The current record.
    private record = '';
    private fields: Cell[] = [];
    private nf = 0;
    private fieldsValid = true;
    private readonly vNF: Var;
    private readonly vNR: Var;
    private readonly vFNR: Var;

    // Main input.
    private argIndex = 1;
    private input: RecordReader | null = null;
    private sawFileOperand = false;
    private inputDone = false;

    private rangeActive: boolean[] = [];
    private seed = 0;
    private randState = 0;

    constructor(private readonly program: Program, private readonly host: AwkHost, options: AwkOptions) {
        this.streams = new AwkStreams(host, this.regexes);
        for (const name of SPECIALS) this.globals.set(name, { kind: SCALAR, cell: EMPTY_STR, arr: null, special: name });
        this.vNF = this.globals.get('NF')!;
        this.vNR = this.globals.get('NR')!;
        this.vFNR = this.globals.get('FNR')!;
        this.setSpecial('FS', str(' '));
        this.setSpecial('OFS', str(' '));
        this.setSpecial('ORS', str('\n'));
        this.setSpecial('RS', str('\n'));
        this.setSpecial('SUBSEP', str('\x1c'));
        this.setSpecial('CONVFMT', str('%.6g'));
        this.setSpecial('OFMT', str('%.6g'));
        this.setSpecial('NR', ZERO);
        this.setSpecial('FNR', ZERO);
        this.setSpecial('NF', ZERO);
        this.setSpecial('RSTART', ZERO);
        this.setSpecial('RLENGTH', num(-1));
        this.setSpecial('FILENAME', EMPTY_STR);

        const environ: AwkArray = new Map();
        for (const [k, v] of Object.entries(host.environ)) environ.set(k, strnum(v));
        this.globals.set('ENVIRON', { kind: ARRAY, cell: UNINIT_CELL, arr: environ });
        const argv: AwkArray = new Map();
        options.argv.forEach((a, i) => argv.set(String(i), strnum(a)));
        this.globals.set('ARGV', { kind: ARRAY, cell: UNINIT_CELL, arr: argv });
        this.globals.set('ARGC', { kind: SCALAR, cell: num(options.argv.length), arr: null });

        if (options.fs !== undefined) this.setSpecial('FS', str(options.fs));
        for (const [name, value] of options.assignments) this.assignOperand(name, value);
        this.randState = this.seedState(0);
    }

    /** Runs the program; resolves to the exit status. */
    async run(): Promise<number> {
        let status = 0;
        let exiting = false;
        try {
            for (const s of this.program.begin) await this.exec(s);
        } catch (e) {
            if (!(e instanceof AwkExit)) throw e;
            exiting = true;
            status = e.status ?? status;
        }
        if (!exiting && (this.program.rules.length > 0 || this.program.end.length > 0)) {
            try {
                await this.mainLoop();
            } catch (e) {
                if (!(e instanceof AwkExit)) throw e;
                status = e.status ?? status;
            }
        }
        try {
            for (const s of this.program.end) await this.exec(s);
        } catch (e) {
            if (!(e instanceof AwkExit)) throw e;
            status = e.status ?? status;
        }
        await this.streams.closeAll();
        return status;
    }

    /** Flushes and closes all streams (after a fatal error). */
    async shutdown(): Promise<void> {
        try { await this.streams.closeAll(); } catch { /* already failing */ }
    }

    // ---- main input ---------------------------------------------------

    private async mainLoop(): Promise<void> {
        const rules = this.program.rules;
        this.rangeActive = rules.map(() => false);
        for (;;) {
            const rec = this.nextMainRecord();
            if (rec === null) break;
            this.setRecord(rec);
            this.bumpNR();
            try {
                for (let k = 0; k < rules.length; k++) {
                    const rule = rules[k];
                    let selected: boolean;
                    if (rule.pattern2) {
                        if (this.rangeActive[k]) {
                            selected = true;
                            if (toBool(await this.eval(rule.pattern2))) this.rangeActive[k] = false;
                        } else if (toBool(await this.eval(rule.pattern!))) {
                            selected = true;
                            this.rangeActive[k] = !toBool(await this.eval(rule.pattern2));
                        } else {
                            selected = false;
                        }
                    } else {
                        selected = !rule.pattern || toBool(await this.eval(rule.pattern));
                    }
                    if (!selected) continue;
                    if (rule.action) await this.exec(rule.action);
                    else this.host.writeStdout(this.record + this.ors);
                }
            } catch (e) {
                if (e instanceof AwkNext) continue;
                if (e instanceof AwkNextFile) { this.input = null; continue; }
                throw e;
            }
        }
    }

    private bumpNR(): void {
        this.assignVar(this.vNR, num(toNumber(this.vNR.cell) + 1));
        this.assignVar(this.vFNR, num(toNumber(this.vFNR.cell) + 1));
    }

    /** The next record of the main input, opening ARGV files as needed. */
    private nextMainRecord(): string | null {
        for (;;) {
            if (!this.input && !this.openNextInput()) return null;
            const rec = this.input!.read(this.rs);
            if (rec !== null) return rec;
            this.input = null;
        }
    }

    private openNextInput(): boolean {
        if (this.inputDone) return false;
        const argv = this.globals.get('ARGV')!;
        for (;;) {
            const argc = toNumber(this.scalarValue(this.globals.get('ARGC')!));
            if (this.argIndex >= argc) break;
            const elem = argv.arr?.get(String(this.argIndex++));
            if (!elem) continue;
            const arg = this.str(elem);
            if (arg === '') continue;
            if (ASSIGNMENT_OPERAND.test(arg)) {
                const eq = arg.indexOf('=');
                this.assignOperand(arg.slice(0, eq), arg.slice(eq + 1));
                continue;
            }
            this.sawFileOperand = true;
            let reader: RecordReader;
            if (arg === '-' || arg === '/dev/stdin') {
                reader = this.streams.stdinReader();
            } else {
                const r = this.host.readFile(arg);
                if (!r.ok) {
                    if (r.directory) { this.host.writeStderr(`awk: warning: command line argument \`${arg}' is a directory: skipped\n`); continue; }
                    throw new AwkRuntimeError(`cannot open ${arg} (${r.error})`);
                }
                reader = new RecordReader(r.data, this.regexes);
            }
            this.assignVar(this.globals.get('FILENAME')!, str(arg));
            this.assignVar(this.vFNR, ZERO);
            this.input = reader;
            return true;
        }
        if (!this.sawFileOperand) {
            this.sawFileOperand = true;
            this.assignVar(this.vFNR, ZERO);
            this.input = this.streams.stdinReader();
            return true;
        }
        this.inputDone = true;
        return false;
    }

    /** -v and var=value operands: escape sequences processed; numeric strings are strnums. */
    private assignOperand(name: string, value: string): void {
        const v = this.global(name);
        this.assignVar(v, strnum(processEscapes(value)));
    }

    // ---- records and fields -------------------------------------------

    private setRecord(rec: string): void {
        this.record = rec;
        this.fieldsValid = false;
    }

    private ensureFields(): void {
        if (this.fieldsValid) return;
        const parts = splitFields(this.record, this.fs, this.regexes, this.rs === '');
        this.fields = new Array(parts.length + 1);
        this.fields[0] = UNINIT_CELL;
        for (let i = 0; i < parts.length; i++) this.fields[i + 1] = strnum(parts[i]);
        this.nf = parts.length;
        this.fieldsValid = true;
        this.vNF.cell = num(this.nf);
    }

    private getField(i: number): Cell {
        if (i === 0) return strnum(this.record);
        this.ensureFields();
        return i <= this.nf ? this.fields[i] : UNINIT_CELL;
    }

    private fieldIndex(c: Cell): number {
        const n = Math.trunc(toNumber(c));
        if (n < 0 || Number.isNaN(n)) throw new AwkRuntimeError(`trying to access out of range field ${n}`);
        return n;
    }

    private setField(i: number, c: Cell): void {
        if (i === 0) { this.setRecord(this.str(c)); return; }
        this.ensureFields();
        if (i > this.nf) {
            for (let k = this.nf + 1; k < i; k++) this.fields[k] = EMPTY_STR;
            this.nf = i;
            this.vNF.cell = num(i);
        }
        this.fields[i] = c;
        this.rebuildRecord();
    }

    private setNF(n: number): void {
        this.ensureFields();
        n = Math.trunc(n);
        if (n < 0) throw new AwkRuntimeError(`NF set to negative value`);
        for (let k = this.nf + 1; k <= n; k++) this.fields[k] = EMPTY_STR;
        this.fields.length = n + 1;
        this.nf = n;
        this.rebuildRecord();
    }

    private rebuildRecord(): void {
        let rec = '';
        for (let k = 1; k <= this.nf; k++) rec += (k > 1 ? this.ofs : '') + this.str(this.fields[k]);
        this.record = rec;
    }

    // ---- variables -----------------------------------------------------

    private global(name: string): Var {
        let v = this.globals.get(name);
        if (!v) {
            v = { kind: UNTYPED, cell: UNINIT_CELL, arr: null };
            this.globals.set(name, v);
        }
        return v;
    }

    private resolve(ref: NameRef): Var {
        if (ref.local >= 0) return this.frame[ref.local];
        if (this.program.functions.has(ref.name)) throw new AwkRuntimeError(`function name ${ref.name} used as a variable`);
        return this.global(ref.name);
    }

    private scalarValue(v: Var): Cell {
        if (v.kind === ARRAY) throw new AwkRuntimeError(`can't use array in scalar context`);
        if (v === this.vNF) this.ensureFields();
        return v.cell;
    }

    private assignVar(v: Var, c: Cell): void {
        if (v.kind === ARRAY) throw new AwkRuntimeError(`can't assign to an array name`);
        v.kind = SCALAR;
        v.cell = c;
        if (v.special) this.onSpecial(v.special, c);
    }

    private setSpecial(name: string, c: Cell): void {
        this.assignVar(this.globals.get(name)!, c);
    }

    private onSpecial(name: string, c: Cell): void {
        switch (name) {
            case 'NF': this.setNF(toNumber(c)); this.vNF.cell = num(this.nf); break;
            case 'FS': this.fs = this.str(c); break;
            case 'OFS': this.ofs = this.str(c); break;
            case 'ORS': this.ors = this.str(c); break;
            case 'RS': this.rs = this.str(c); break;
            case 'SUBSEP': this.subsep = this.str(c); break;
            case 'CONVFMT': this.convfmt = c.t === NUM ? numberToString(c.n, '%.6g', this.format) : c.s; break;
            case 'OFMT': this.ofmt = c.t === NUM ? numberToString(c.n, '%.6g', this.format) : c.s; break;
        }
    }

    private arrayOf(v: Var): AwkArray {
        if (v.kind === ARRAY) return v.arr!;
        if (v.kind === SCALAR) throw new AwkRuntimeError(`can't use scalar as array`);
        // Untyped: becomes an array, shared with the caller's untyped argument.
        let root: Var | undefined = v.link;
        while (root && root.kind === UNTYPED && root.link) root = root.link;
        const arr: AwkArray = root && root.kind === ARRAY ? root.arr! : new Map();
        for (let w: Var | undefined = v; w && w.kind === UNTYPED; w = w.link) {
            w.kind = ARRAY;
            w.arr = arr;
        }
        return arr;
    }

    private subscript(cells: Cell[]): string {
        if (cells.length === 1) return this.str(cells[0]);
        return cells.map(c => this.str(c)).join(this.subsep);
    }

    private async subscriptOf(subs: Expr[]): Promise<string> {
        if (subs.length === 1) return this.str(await this.eval(subs[0]));
        const cells: Cell[] = [];
        for (const e of subs) cells.push(await this.eval(e));
        return this.subscript(cells);
    }

    // ---- conversions ---------------------------------------------------

    /** String value, numbers via CONVFMT. */
    private str(c: Cell): string {
        return c.t === NUM ? numberToString(c.n, this.convfmt, this.format) : c.s;
    }

    /** Output string value, numbers via OFMT. */
    private outStr(c: Cell): string {
        return c.t === NUM ? numberToString(c.n, this.ofmt, this.format) : c.s;
    }

    private compare(a: Cell, b: Cell): number {
        if (isNumeric(a) && isNumeric(b)) {
            const x = a.n, y = b.n;
            return x < y ? -1 : x > y ? 1 : x === y ? 0 : NaN;
        }
        const s = this.str(a), t = this.str(b);
        return s < t ? -1 : s > t ? 1 : 0;
    }

    private regexFor(e: Expr, value?: Cell): RegExp {
        return this.regexes.get(e.kind === 'regex' ? e.source : this.str(value!)).re;
    }

    private async regexOf(e: Expr): Promise<{ re: RegExp; global: RegExp }> {
        return this.regexes.get(e.kind === 'regex' ? e.source : this.str(await this.eval(e)));
    }

    // ---- lvalues -------------------------------------------------------

    private async getLvalue(lv: LValue): Promise<Cell> {
        switch (lv.kind) {
            case 'var': return this.scalarValue(this.resolve(lv.ref));
            case 'index': {
                const arr = this.arrayOf(this.resolve(lv.ref));
                const key = await this.subscriptOf(lv.subs);
                const c = arr.get(key);
                if (c) return c;
                arr.set(key, UNINIT_CELL);
                return UNINIT_CELL;
            }
            case 'field': return this.getField(this.fieldIndex(await this.eval(lv.index)));
        }
    }

    /**
     * Evaluates the target's location, then calls `compute` with its current
     * value and stores the result. Returns the stored value.
     */
    private async update(lv: LValue, compute: (old: Cell) => Promise<Cell> | Cell): Promise<Cell> {
        switch (lv.kind) {
            case 'var': {
                const v = this.resolve(lv.ref);
                const c = await compute(v.kind === UNTYPED ? UNINIT_CELL : this.scalarValue(v));
                this.assignVar(v, c);
                return c;
            }
            case 'index': {
                const arr = this.arrayOf(this.resolve(lv.ref));
                const key = await this.subscriptOf(lv.subs);
                const c = await compute(arr.get(key) ?? UNINIT_CELL);
                arr.set(key, c);
                return c;
            }
            case 'field': {
                const i = this.fieldIndex(await this.eval(lv.index));
                const c = await compute(this.getField(i));
                this.setField(i, c);
                return c;
            }
        }
    }

    private assign(lv: LValue, c: Cell): Promise<Cell> {
        return this.update(lv, () => c);
    }

    // ---- statements ----------------------------------------------------

    private async exec(s: Stmt): Promise<Completion> {
        switch (s.kind) {
            case 'block':
                for (const st of s.body) {
                    const r = await this.exec(st);
                    if (r !== NORMAL) return r;
                }
                return NORMAL;
            case 'expr':
                await this.eval(s.expr);
                return NORMAL;
            case 'print':
                await this.print(s);
                return NORMAL;
            case 'if':
                if (toBool(await this.eval(s.cond))) return this.exec(s.then);
                return s.else ? this.exec(s.else) : NORMAL;
            case 'while':
                while (toBool(await this.eval(s.cond))) {
                    const r = await this.exec(s.body);
                    if (r === BREAK) break;
                    if (r === RETURN) return r;
                }
                return NORMAL;
            case 'do':
                do {
                    const r = await this.exec(s.body);
                    if (r === BREAK) break;
                    if (r === RETURN) return r;
                } while (toBool(await this.eval(s.cond)));
                return NORMAL;
            case 'for':
                if (s.init) await this.eval(s.init);
                while (!s.cond || toBool(await this.eval(s.cond))) {
                    const r = await this.exec(s.body);
                    if (r === BREAK) break;
                    if (r === RETURN) return r;
                    if (s.update) await this.eval(s.update);
                }
                return NORMAL;
            case 'forin': {
                const arr = this.arrayOf(this.resolve(s.array));
                for (const key of [...arr.keys()]) {
                    if (!arr.has(key)) continue;
                    await this.assign(s.variable, strnum(key));
                    const r = await this.exec(s.body);
                    if (r === BREAK) break;
                    if (r === RETURN) return r;
                }
                return NORMAL;
            }
            case 'break': return BREAK;
            case 'continue': return CONTINUE;
            case 'next': throw new AwkNext();
            case 'nextfile': throw new AwkNextFile();
            case 'exit': {
                const value = s.value ? Math.trunc(toNumber(await this.eval(s.value))) & 0xff : undefined;
                throw new AwkExit(value);
            }
            case 'return':
                this.returnValue = s.value ? await this.eval(s.value) : UNINIT_CELL;
                return RETURN;
            case 'delete': {
                const arr = this.arrayOf(this.resolve(s.array));
                if (s.subs) arr.delete(await this.subscriptOf(s.subs));
                else arr.clear();
                return NORMAL;
            }
        }
    }

    private async print(s: Extract<Stmt, { kind: 'print' }>): Promise<void> {
        let data: string;
        if (s.printf) {
            const cells: Cell[] = [];
            for (const a of s.args) cells.push(await this.eval(a));
            data = awkSprintf(this.str(cells[0]), cells.slice(1), c => this.str(c));
        } else if (s.args.length === 0) {
            data = this.record + this.ors;
        } else {
            data = '';
            for (let i = 0; i < s.args.length; i++) {
                if (i > 0) data += this.ofs;
                data += this.outStr(await this.eval(s.args[i]));
            }
            data += this.ors;
        }
        if (!s.redirect) { this.host.writeStdout(data); return; }
        const target = this.str(await this.eval(s.redirect.target));
        this.streams.write(target, s.redirect.mode, data);
    }

    // ---- expressions ---------------------------------------------------

    private async eval(e: Expr): Promise<Cell> {
        switch (e.kind) {
            case 'num': return num(e.value);
            case 'str': return str(e.value);
            case 'regex': return bool(this.regexes.get(e.source).re.test(this.record));
            case 'var': {
                const v = this.resolve(e.ref);
                return v.kind === UNTYPED ? UNINIT_CELL : this.scalarValue(v);
            }
            case 'index': case 'field': return this.getLvalue(e);
            case 'group': throw new AwkRuntimeError('syntax error: unexpected expression list');
            case 'unary': {
                const v = await this.eval(e.expr);
                if (e.op === '!') return bool(!toBool(v));
                return num(e.op === '-' ? -toNumber(v) : toNumber(v));
            }
            case 'binary': {
                const a = toNumber(await this.eval(e.left));
                const b = toNumber(await this.eval(e.right));
                return num(this.arith(e.op, a, b));
            }
            case 'concat': {
                const a = this.str(await this.eval(e.left));
                return str(a + this.str(await this.eval(e.right)));
            }
            case 'compare': {
                const c = this.compare(await this.eval(e.left), await this.eval(e.right));
                switch (e.op) {
                    case '<': return bool(c < 0);
                    case '<=': return bool(c <= 0);
                    case '==': return bool(c === 0);
                    case '!=': return bool(c !== 0);
                    case '>': return bool(c > 0);
                    default: return bool(c >= 0);
                }
            }
            case 'match': {
                const subject = this.str(await this.eval(e.left));
                const re = e.right.kind === 'regex' ? this.regexFor(e.right) : this.regexFor(e.right, await this.eval(e.right));
                return bool(re.test(subject) !== e.negate);
            }
            case 'and': return bool(toBool(await this.eval(e.left)) && toBool(await this.eval(e.right)));
            case 'or': return bool(toBool(await this.eval(e.left)) || toBool(await this.eval(e.right)));
            case 'in': {
                const v = this.resolve(e.array);
                if (v.kind === UNTYPED) return ZERO;
                const cells: Cell[] = [];
                for (const s of e.subs) cells.push(await this.eval(s));
                return bool(this.arrayOf(v).has(this.subscript(cells)));
            }
            case 'cond': return toBool(await this.eval(e.cond)) ? this.eval(e.then) : this.eval(e.else);
            case 'assign': {
                if (e.op === '=') {
                    if (e.target.kind === 'var') {
                        const v = this.resolve(e.target.ref);
                        const c = await this.eval(e.value);
                        this.assignVar(v, c);
                        return c;
                    }
                    const value = e.value;
                    return this.update(e.target, () => this.eval(value));
                }
                const op = e.op[0] as '+' | '-' | '*' | '/' | '%' | '^';
                const value = e.value;
                return this.update(e.target, async old => {
                    const b = toNumber(await this.eval(value));
                    return num(this.arith(op, toNumber(old), b));
                });
            }
            case 'incdec': {
                let before = 0;
                const delta = e.op === '++' ? 1 : -1;
                const after = await this.update(e.target, old => {
                    before = toNumber(old);
                    return num(before + delta);
                });
                return e.prefix ? after : num(before);
            }
            case 'call': return this.callFunction(e.name, e.args);
            case 'builtin': return this.builtin(e.name, e.args);
            case 'getline': return this.getline(e);
        }
    }

    private arith(op: string, a: number, b: number): number {
        switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/':
                if (b === 0) throw new AwkRuntimeError('division by zero');
                return a / b;
            case '%':
                if (b === 0) throw new AwkRuntimeError('division by zero in %');
                return a % b;
            default: return Math.pow(a, b);
        }
    }

    // ---- getline -------------------------------------------------------

    private async getline(e: Extract<Expr, { kind: 'getline' }>): Promise<Cell> {
        let rec: string | null;
        if (e.source === 'main') {
            rec = this.nextMainRecord();
            if (rec === null) return ZERO;
            this.bumpNR();
        } else {
            const name = this.str(await this.eval(e.src!));
            let reader: RecordReader | null;
            if (e.source === 'file') {
                reader = this.streams.inputFile(name);
                if (!reader) return num(-1);
            } else {
                reader = await this.streams.inputCommand(name);
            }
            rec = reader.read(this.rs);
            if (rec === null) return ZERO;
            if (e.source === 'cmd') this.assignVar(this.vNR, num(toNumber(this.vNR.cell) + 1));
        }
        if (e.target) await this.assign(e.target, strnum(rec));
        else this.setRecord(rec);
        return ONE;
    }

    // ---- user functions ------------------------------------------------

    private async callFunction(name: string, args: Expr[]): Promise<Cell> {
        const def: FunctionDef = this.program.functions.get(name)!;
        if (args.length > def.params.length) throw new AwkRuntimeError(`function ${name} called with ${args.length} args, accepts only ${def.params.length}`);
        const locals: Var[] = new Array(def.params.length);
        for (let i = 0; i < def.params.length; i++) {
            const a = args[i];
            if (!a) { locals[i] = { kind: UNTYPED, cell: UNINIT_CELL, arr: null }; continue; }
            if (a.kind === 'var') {
                const v = this.resolve(a.ref);
                if (v.kind === ARRAY) { locals[i] = v; continue; }
                if (v.kind === UNTYPED) { locals[i] = { kind: UNTYPED, cell: UNINIT_CELL, arr: null, link: v }; continue; }
                locals[i] = { kind: SCALAR, cell: this.scalarValue(v), arr: null };
                continue;
            }
            locals[i] = { kind: SCALAR, cell: await this.eval(a), arr: null };
        }
        if (++this.depth > MAX_CALL_DEPTH) throw new AwkRuntimeError(`function call nesting too deep`);
        const saved = this.frame;
        this.frame = locals;
        this.returnValue = UNINIT_CELL;
        try {
            await this.exec(def.body);
            const result = this.returnValue;
            this.returnValue = UNINIT_CELL;
            return result;
        } finally {
            this.frame = saved;
            this.depth--;
        }
    }

    // ---- builtins ------------------------------------------------------

    private async args(list: Expr[]): Promise<Cell[]> {
        const out: Cell[] = [];
        for (const a of list) out.push(await this.eval(a));
        return out;
    }

    private async builtin(name: string, a: Expr[]): Promise<Cell> {
        switch (name) {
            case 'length': {
                if (a.length === 0) return num(S.charLength(this.record));
                if (a[0].kind === 'var') {
                    const v = this.resolve(a[0].ref);
                    if (v.kind === ARRAY) return num(v.arr!.size);
                    if (v.kind === UNTYPED) return ZERO;
                }
                return num(S.charLength(this.str(await this.eval(a[0]))));
            }
            case 'substr': {
                const [s, m, n] = await this.args(a);
                return str(S.substr(this.str(s), toNumber(m), n === undefined ? undefined : toNumber(n)));
            }
            case 'index': {
                const [s, t] = await this.args(a);
                return num(S.index(this.str(s), this.str(t)));
            }
            case 'split': return this.split(a);
            case 'sub': case 'gsub': return this.substitute(a, name === 'gsub');
            case 'match': {
                const s = this.str(await this.eval(a[0]));
                const { re } = await this.regexOf(a[1]);
                const m = S.matchPosition(s, re);
                this.setSpecial('RSTART', num(m.start));
                this.setSpecial('RLENGTH', num(m.length));
                return num(m.start);
            }
            case 'sprintf': {
                const cells = await this.args(a);
                return str(awkSprintf(this.str(cells[0]), cells.slice(1), c => this.str(c)));
            }
            case 'sin': return num(Math.sin(toNumber(await this.eval(a[0]))));
            case 'cos': return num(Math.cos(toNumber(await this.eval(a[0]))));
            case 'atan2': {
                const [y, x] = await this.args(a);
                return num(Math.atan2(toNumber(y), toNumber(x)));
            }
            case 'exp': return num(Math.exp(toNumber(await this.eval(a[0]))));
            case 'log': return num(Math.log(toNumber(await this.eval(a[0]))));
            case 'sqrt': return num(Math.sqrt(toNumber(await this.eval(a[0]))));
            case 'int': return num(Math.trunc(toNumber(await this.eval(a[0]))));
            case 'rand': return num(this.rand());
            case 'srand': {
                const prev = this.seed;
                this.seed = a.length ? toNumber(await this.eval(a[0])) : Math.floor(this.host.now());
                this.randState = this.seedState(this.seed);
                return num(prev);
            }
            case 'tolower': return str(this.str(await this.eval(a[0])).toLowerCase());
            case 'toupper': return str(this.str(await this.eval(a[0])).toUpperCase());
            case 'system': {
                const cmd = this.str(await this.eval(a[0]));
                return num(await this.streams.system(cmd));
            }
            case 'close': return num(await this.streams.close(this.str(await this.eval(a[0]))));
            case 'fflush': return num(this.streams.flush(a.length ? this.str(await this.eval(a[0])) : undefined));
        }
        throw new AwkRuntimeError(`unknown function ${name}`);
    }

    private async split(a: Expr[]): Promise<Cell> {
        const s = this.str(await this.eval(a[0]));
        const target = a[1];
        if (target.kind !== 'var') throw new AwkRuntimeError('split: second argument is not an array');
        let parts: string[];
        if (a.length < 3) parts = splitFields(s, this.fs, this.regexes);
        else if (a[2].kind === 'regex') parts = splitFields(s, a[2].source, this.regexes, false, true);
        else parts = splitFields(s, this.str(await this.eval(a[2])), this.regexes);
        const arr = this.arrayOf(this.resolve(target.ref));
        arr.clear();
        parts.forEach((p, i) => arr.set(String(i + 1), strnum(p)));
        return num(parts.length);
    }

    private async substitute(a: Expr[], global: boolean): Promise<Cell> {
        const { global: re } = await this.regexOf(a[0]);
        const repl = this.str(await this.eval(a[1]));
        const target: Expr = a[2] ?? { kind: 'field', index: { kind: 'num', value: 0 } };
        const isLvalue = target.kind === 'var' || target.kind === 'index' || target.kind === 'field';
        if (!isLvalue) {
            return num(S.substitute(this.str(await this.eval(target)), re, repl, global).count);
        }
        let count = 0;
        await this.update(target as LValue, old => {
            const r = S.substitute(this.str(old), re, repl, global);
            count = r.count;
            return count > 0 ? str(r.result) : old;
        });
        return num(count);
    }

    // ---- rand / srand: a 48-bit linear congruential generator (drand48) --

    private seedState(seed: number): number {
        const s = Math.trunc(seed) >>> 0;
        return s * 65536 + 0x330e;
    }

    private rand(): number {
        // X(n+1) = (a X(n) + c) mod 2^48, computed in BigInt-free 24-bit halves.
        const a = 0x5deece66d;
        const x = this.randState;
        const xHi = Math.floor(x / 16777216), xLo = x % 16777216;
        const aHi = Math.floor(a / 16777216), aLo = a % 16777216;
        const lo = xLo * aLo + 0xb;
        const hi = (xHi * aLo + xLo * aHi + Math.floor(lo / 16777216)) % 16777216;
        this.randState = hi * 16777216 + (lo % 16777216);
        return this.randState / 281474976710656;
    }
}
