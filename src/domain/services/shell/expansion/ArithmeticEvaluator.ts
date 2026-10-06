/**
 * ArithmeticEvaluator - POSIX shell arithmetic (XCU §2.6.4).
 *
 * Signed integer arithmetic with the C operators the standard requires:
 * `, = *= /= %= += -= <<= >>= &= ^= |= ?: || && | ^ & == != < <= > >=
 * << >> + - * / % ! ~` unary `+ -`, parentheses, decimal/octal/hex
 * constants and variables (an unset or empty variable is 0).
 * Variable writes go through the injected accessor so the shell sees them.
 */

export interface ArithmeticVariables {
    get(name: string): string | undefined;
    set(name: string, value: string): void;
}

export class ArithmeticError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ArithmeticError';
    }
}

type Tok = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

const OPS = ['<<=', '>>=', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '*=', '/=', '%=', '+=', '-=', '&=', '^=', '|=', '++', '--',
    '+', '-', '*', '/', '%', '<', '>', '&', '|', '^', '!', '~', '?', ':', '=', '(', ')', ','];

const BINARY: Record<string, [number, (a: number, b: number) => number]> = {
    '||': [1, (a, b) => (a || b ? 1 : 0)],
    '&&': [2, (a, b) => (a && b ? 1 : 0)],
    '|': [3, (a, b) => a | b],
    '^': [4, (a, b) => a ^ b],
    '&': [5, (a, b) => a & b],
    '==': [6, (a, b) => (a === b ? 1 : 0)],
    '!=': [6, (a, b) => (a !== b ? 1 : 0)],
    '<': [7, (a, b) => (a < b ? 1 : 0)],
    '<=': [7, (a, b) => (a <= b ? 1 : 0)],
    '>': [7, (a, b) => (a > b ? 1 : 0)],
    '>=': [7, (a, b) => (a >= b ? 1 : 0)],
    '<<': [8, (a, b) => a << b],
    '>>': [8, (a, b) => a >> b],
    '+': [9, (a, b) => a + b],
    '-': [9, (a, b) => a - b],
    '*': [10, (a, b) => a * b],
    '/': [10, (a, b) => { if (b === 0) throw new ArithmeticError('division by zero'); return Math.trunc(a / b); }],
    '%': [10, (a, b) => { if (b === 0) throw new ArithmeticError('division by zero'); return a % b; }],
};

/** Depth guard against self-referencing variables (x=x), shared across nested evaluators. */
let depth = 0;

const NO_VARS: ArithmeticVariables = { get: () => undefined, set: () => { /* read-only */ } };

export class ArithmeticEvaluator {
    private toks: Tok[] = [];
    private i = 0;
    private vars: ArithmeticVariables = NO_VARS;

    evaluate(expression: string, vars: ArithmeticVariables = NO_VARS): number {
        const savedToks = this.toks, savedI = this.i, savedVars = this.vars;
        try {
            this.toks = this.tokenize(expression);
            this.i = 0;
            this.vars = vars;
            if (this.toks.length === 0) return 0;
            const v = this.comma();
            if (this.i < this.toks.length) throw new ArithmeticError(`syntax error: unexpected '${this.toks[this.i].v}'`);
            return v;
        } finally {
            this.toks = savedToks; this.i = savedI; this.vars = savedVars;
        }
    }

    private tokenize(s: string): Tok[] {
        const out: Tok[] = [];
        let i = 0;
        while (i < s.length) {
            const c = s[i];
            if (/\s/.test(c)) { i++; continue; }
            const num = /^(0[xX][0-9a-fA-F]+|[0-9]+)/.exec(s.substring(i));
            if (num) {
                const text = num[1];
                let v: number;
                if (/^0[xX]/.test(text)) v = parseInt(text, 16);
                else if (text.length > 1 && text[0] === '0') {
                    if (/[89]/.test(text)) throw new ArithmeticError(`invalid octal constant '${text}'`);
                    v = parseInt(text, 8);
                } else v = parseInt(text, 10);
                if (/[A-Za-z_]/.test(s[i + text.length] ?? '')) throw new ArithmeticError(`invalid number '${s.substring(i).split(/\W/)[0]}'`);
                out.push({ t: 'num', v });
                i += text.length;
                continue;
            }
            const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.substring(i));
            if (id) { out.push({ t: 'id', v: id[0] }); i += id[0].length; continue; }
            const op = OPS.find(o => s.startsWith(o, i));
            if (!op) throw new ArithmeticError(`syntax error: invalid character '${c}'`);
            out.push({ t: 'op', v: op });
            i += op.length;
        }
        return out;
    }

    private peekOp(v: string): boolean {
        const t = this.toks[this.i];
        return !!t && t.t === 'op' && t.v === v;
    }

    private expectOp(v: string) {
        if (!this.peekOp(v)) throw new ArithmeticError(`syntax error: expected '${v}'`);
        this.i++;
    }

    private comma(): number {
        let v = this.assignment();
        while (this.peekOp(',')) { this.i++; v = this.assignment(); }
        return v;
    }

    private assignment(): number {
        const t = this.toks[this.i];
        const next = this.toks[this.i + 1];
        if (t?.t === 'id' && next?.t === 'op' && /^([*\/%+\-&^|]|<<|>>)?=$/.test(next.v)) {
            this.i += 2;
            const rhs = this.assignment();
            let value = rhs;
            if (next.v !== '=') {
                const op = next.v.slice(0, -1);
                value = BINARY[op][1](this.readVar(t.v), rhs);
            }
            value = value | 0;
            this.vars.set(t.v, String(value));
            return value;
        }
        return this.conditional();
    }

    private conditional(): number {
        const cond = this.binary(1);
        if (!this.peekOp('?')) return cond;
        this.i++;
        // Both branches are parsed; only the chosen one's side effects matter in practice.
        const a = this.assignment();
        this.expectOp(':');
        const b = this.assignment();
        return cond ? a : b;
    }

    private binary(minPrec: number): number {
        let left = this.unary();
        while (true) {
            const t = this.toks[this.i];
            if (!t || t.t !== 'op' || !BINARY[t.v] || BINARY[t.v][0] < minPrec) return left;
            const [prec, fn] = BINARY[t.v];
            this.i++;
            const right = this.binary(prec + 1);
            left = fn(left, right) | 0;
        }
    }

    private unary(): number {
        const t = this.toks[this.i];
        if (t?.t === 'op') {
            if (t.v === '+') { this.i++; return this.unary(); }
            if (t.v === '-') { this.i++; return -this.unary() | 0; }
            if (t.v === '!') { this.i++; return this.unary() ? 0 : 1; }
            if (t.v === '~') { this.i++; return ~this.unary(); }
            if (t.v === '++' || t.v === '--') {
                this.i++;
                const id = this.toks[this.i++];
                if (id?.t !== 'id') throw new ArithmeticError(`'${t.v}' requires a variable`);
                const v = this.readVar(id.v) + (t.v === '++' ? 1 : -1);
                this.vars.set(id.v, String(v));
                return v;
            }
        }
        return this.postfix();
    }

    private postfix(): number {
        const t = this.toks[this.i];
        const next = this.toks[this.i + 1];
        if (t?.t === 'id' && next?.t === 'op' && (next.v === '++' || next.v === '--')) {
            this.i += 2;
            const v = this.readVar(t.v);
            this.vars.set(t.v, String(v + (next.v === '++' ? 1 : -1)));
            return v;
        }
        return this.primary();
    }

    private primary(): number {
        const t = this.toks[this.i++];
        if (!t) throw new ArithmeticError('syntax error: unexpected end of expression');
        if (t.t === 'num') return t.v | 0;
        if (t.t === 'id') return this.readVar(t.v);
        if (t.v === '(') {
            const v = this.comma();
            this.expectOp(')');
            return v;
        }
        throw new ArithmeticError(`syntax error: unexpected '${t.v}'`);
    }

    private readVar(name: string): number {
        const raw = (this.vars.get(name) ?? '').trim();
        if (raw === '') return 0;
        if (depth > 32) throw new ArithmeticError('expression recursion level exceeded');
        depth++;
        try {
            return new ArithmeticEvaluator().evaluate(raw, this.vars);
        } finally {
            depth--;
        }
    }
}
