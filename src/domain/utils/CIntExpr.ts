/**
 * CIntExpr - C-like integer expression evaluator shared by utilities that
 * embed one: m4's `eval` builtin (32-bit signed, `**`, radix literals) and
 * gettext's `Plural-Forms` header (unsigned long, `n`, `?:`).
 *
 * Arithmetic is done on BigInt and folded to the dialect's integer width
 * after every operation, so overflow wraps exactly like the C original.
 * Logical operators short-circuit, so `0 && 1/0` is not an error.
 */

export type CExprErrorKind = 'bad input' | 'excess input' | 'missing' | 'divide by zero' | 'modulo by zero' | 'negative exponent';

export class CExprError extends Error {
    constructor(readonly kind: CExprErrorKind) { super(kind); }
}

export interface CExprDialect {
    /** Integer width in bits and signedness of the arithmetic. */
    bits: 32 | 64;
    signed: boolean;
    /** Accepts `a ? b : c`. */
    ternary?: boolean;
    /** Accepts `a ** b` (right operand must be non-negative). */
    power?: boolean;
    /** Accepts m4 literals: 0x.., 0b.., 0r<radix>:<digits>, leading-0 octal. */
    m4Literals?: boolean;
    /** Names that may appear as variables (e.g. `n`). */
    variables?: string[];
    /** Accepts `=` as a (deprecated) spelling of `==` (m4). */
    singleEquals?: boolean;
}

type Node =
    | { t: 'num'; v: bigint }
    | { t: 'var'; name: string }
    | { t: 'un'; op: string; a: Node }
    | { t: 'bin'; op: string; a: Node; b: Node }
    | { t: 'cond'; c: Node; a: Node; b: Node };

/** Binary operator precedence (higher binds tighter); `**` is handled separately. */
const BINARY: Record<string, number> = {
    '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6,
    '<': 7, '<=': 7, '>': 7, '>=': 7, '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10,
};
const OPERATORS = ['**', '||', '&&', '==', '!=', '<=', '>=', '<<', '>>', '|', '^', '&', '<', '>', '=', '+', '-', '*', '/', '%', '!', '~', '(', ')', '?', ':'];

class Parser {
    private pos = 0;
    /** Set when the deprecated `=` operator was used. */
    usedSingleEquals = false;
    constructor(private src: string, private d: CExprDialect) { }

    parse(): Node {
        this.skip();
        if (this.pos >= this.src.length) throw new CExprError('missing');
        const node = this.ternary();
        this.skip();
        if (this.pos < this.src.length) throw new CExprError(this.peekOp() !== null || /[0-9A-Za-z_]/.test(this.src[this.pos]) ? 'excess input' : 'bad input');
        return node;
    }

    private skip() {
        while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) this.pos++;
    }

    private peekOp(): string | null {
        this.skip();
        for (const op of OPERATORS) if (this.src.startsWith(op, this.pos)) {
            if (op === '**' && !this.d.power) return '*';
            if ((op === '?' || op === ':') && !this.d.ternary) return null;
            if (op === '=' && !this.d.singleEquals) return null;
            return op;
        }
        return null;
    }

    private ternary(): Node {
        const c = this.binary(1);
        if (this.d.ternary && this.peekOp() === '?') {
            this.pos++;
            const a = this.ternary();
            if (this.peekOp() !== ':') throw new CExprError('missing');
            this.pos++;
            const b = this.ternary();
            return { t: 'cond', c, a, b };
        }
        return c;
    }

    private binary(minPrec: number): Node {
        let left = this.power();
        for (;;) {
            const op = this.peekOp();
            const prec = op === '=' ? BINARY['=='] : op ? BINARY[op] : undefined;
            if (op === null || prec === undefined || prec < minPrec) return left;
            this.pos += op.length;
            if (op === '=') this.usedSingleEquals = true;
            const right = this.binary(prec + 1);
            left = { t: 'bin', op: op === '=' ? '==' : op, a: left, b: right };
        }
    }

    /** power := unary [ '**' power ]  (right-associative, unary binds tighter). */
    private power(): Node {
        const base = this.unary();
        if (this.d.power && this.peekOp() === '**') {
            this.pos += 2;
            return { t: 'bin', op: '**', a: base, b: this.power() };
        }
        return base;
    }

    private unary(): Node {
        const op = this.peekOp();
        if (op === '-' || op === '+' || op === '!' || op === '~') {
            this.pos++;
            return { t: 'un', op, a: this.unary() };
        }
        return this.primary();
    }

    private primary(): Node {
        this.skip();
        if (this.pos >= this.src.length) throw new CExprError('missing');
        const c = this.src[this.pos];
        if (c === '(') {
            this.pos++;
            const e = this.ternary();
            if (this.peekOp() !== ')') throw new CExprError(this.pos >= this.src.length ? 'missing' : 'bad input');
            this.pos++;
            return e;
        }
        if (/[0-9]/.test(c)) return { t: 'num', v: this.number() };
        const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.src.substring(this.pos));
        if (name && this.d.variables?.includes(name[0])) {
            this.pos += name[0].length;
            return { t: 'var', name: name[0] };
        }
        if (this.peekOp() !== null || /[A-Za-z_]/.test(c)) throw new CExprError('missing');
        throw new CExprError('bad input');
    }

    private number(): bigint {
        const rest = this.src.substring(this.pos);
        let m: RegExpExecArray | null;
        /** Consumes digits valid in `radix` starting at `start`; stops at the first invalid one. */
        const digits = (start: number, radix: number): bigint => {
            let v = 0n;
            this.pos = start;
            while (this.pos < this.src.length) {
                const ch = this.src[this.pos].toLowerCase();
                const dv = radix === 1 ? (ch === '1' ? 0 : 99) : /[0-9a-z]/.test(ch) ? parseInt(ch, 36) : 99;
                if (dv >= Math.max(radix, 2)) break;
                v = radix === 1 ? v + 1n : v * BigInt(radix) + BigInt(dv);
                this.pos++;
            }
            return v;
        };
        if (this.d.m4Literals) {
            const at = this.pos;
            if (/^0[xX]/.test(rest)) return digits(at + 2, 16);
            if (/^0[bB]/.test(rest)) return digits(at + 2, 2);
            if ((m = /^0[rR]([0-9]+):/.exec(rest))) {
                const radix = parseInt(m[1], 10);
                if (radix < 1 || radix > 36) throw new CExprError('bad input');
                return digits(at + m[0].length, radix);
            }
            if (rest[0] === '0') return digits(at + 1, 8);
            return digits(at, 10);
        }
        m = /^(0[xX][0-9A-Fa-f]+|0[0-7]*|[1-9][0-9]*)/.exec(rest)!;
        this.pos += m[0].length;
        return BigInt(m[0].length > 1 && m[0][0] === '0' && !/[xX]/.test(m[0]) ? '0o' + m[0].substring(1) : m[0]);
    }
}

/** A parsed expression, evaluated as often as needed (plural forms per count). */
export class CIntExpr {
    private constructor(private root: Node, private d: CExprDialect) { }

    /** Throws CExprError on a syntax error. */
    static compile(source: string, dialect: CExprDialect): CIntExpr {
        const parser = new Parser(source, dialect);
        const expr = new CIntExpr(parser.parse(), dialect);
        expr.usedSingleEquals = parser.usedSingleEquals;
        return expr;
    }

    /** Whether the deprecated `=` spelling of `==` occurred (m4 warns). */
    usedSingleEquals = false;

    /** Evaluates with the given variables; throws CExprError on division by zero etc. */
    evaluate(vars: Record<string, bigint | number> = {}): bigint {
        return this.ev(this.root, vars);
    }

    private wrap(v: bigint): bigint {
        return this.d.signed ? BigInt.asIntN(this.d.bits, v) : BigInt.asUintN(this.d.bits, v);
    }

    private ev(n: Node, vars: Record<string, bigint | number>): bigint {
        switch (n.t) {
            case 'num': return this.wrap(n.v);
            case 'var': return this.wrap(BigInt(vars[n.name] ?? 0));
            case 'cond': return this.ev(n.c, vars) !== 0n ? this.ev(n.a, vars) : this.ev(n.b, vars);
            case 'un': {
                const a = this.ev(n.a, vars);
                switch (n.op) {
                    case '-': return this.wrap(-a);
                    case '+': return a;
                    case '!': return a === 0n ? 1n : 0n;
                    default: return this.wrap(~a);
                }
            }
            case 'bin': {
                if (n.op === '&&') return this.ev(n.a, vars) !== 0n && this.ev(n.b, vars) !== 0n ? 1n : 0n;
                if (n.op === '||') return this.ev(n.a, vars) !== 0n || this.ev(n.b, vars) !== 0n ? 1n : 0n;
                const a = this.ev(n.a, vars);
                const b = this.ev(n.b, vars);
                const mask = BigInt(this.d.bits - 1);
                switch (n.op) {
                    case '+': return this.wrap(a + b);
                    case '-': return this.wrap(a - b);
                    case '*': return this.wrap(a * b);
                    case '/': if (b === 0n) throw new CExprError('divide by zero'); return this.wrap(a / b);
                    case '%': if (b === 0n) throw new CExprError('modulo by zero'); return this.wrap(a % b);
                    case '**': {
                        if (b < 0n) throw new CExprError('negative exponent');
                        // GNU m4 reports 0**0 as a division by zero.
                        if (a === 0n && b === 0n && this.d.m4Literals) throw new CExprError('divide by zero');
                        let r = 1n, base = a, e = b;
                        while (e > 0n) {
                            if (e & 1n) r = this.wrap(r * base);
                            base = this.wrap(base * base);
                            e >>= 1n;
                        }
                        return r;
                    }
                    case '<<': return this.wrap(a << (b & mask));
                    case '>>': return this.wrap(a >> (b & mask));
                    case '&': return this.wrap(a & b);
                    case '|': return this.wrap(a | b);
                    case '^': return this.wrap(a ^ b);
                    case '==': return a === b ? 1n : 0n;
                    case '!=': return a !== b ? 1n : 0n;
                    case '<': return a < b ? 1n : 0n;
                    case '<=': return a <= b ? 1n : 0n;
                    case '>': return a > b ? 1n : 0n;
                    default: return a >= b ? 1n : 0n;
                }
            }
        }
    }
}
