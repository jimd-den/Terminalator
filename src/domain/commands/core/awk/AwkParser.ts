/**
 * AwkParser - recursive-descent parser for awk programs (XCU awk, "Grammar").
 *
 * Precedence, lowest first: assignment, ?:, ||, &&, in, ~ !~, relational,
 * `cmd | getline`, concatenation, additive, multiplicative, unary ! + -,
 * exponentiation (right-associative), ++/--, $, grouping.
 *
 * Inside an unparenthesized print/printf expression list `>` is output
 * redirection, not a comparison; `print (a, b)` prints an expression list.
 */
import { AwkLexer, AwkSyntaxError, Token } from './AwkLexer';
import { Expr, FunctionDef, LValue, NameRef, Program, Redirect, Rule, Stmt } from './AwkAst';

type Ctx = 'begin' | 'end' | 'rule' | 'function';

const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '^=', '**=']);
const COMPARE_OPS = new Set(['<', '<=', '==', '!=', '>', '>=']);

export function parseAwk(source: string): Program {
    return new AwkParser(new AwkLexer(source).tokenize()).parse();
}

export class AwkParser {
    private i = 0;
    /** Unparenthesized print list: `>` redirects. */
    private noGt = false;
    /** Parameter slots of the function being parsed. */
    private locals: Map<string, number> | null = null;
    private ctx: Ctx = 'rule';
    private loops = 0;
    private readonly calls: { name: string; line: number }[] = [];

    constructor(private readonly tokens: Token[]) { }

    parse(): Program {
        const program: Program = { begin: [], rules: [], end: [], functions: new Map() };
        this.skipTerminators();
        while (!this.at('EOF')) {
            this.item(program);
            this.skipTerminators();
        }
        for (const call of this.calls) {
            if (!program.functions.has(call.name)) {
                throw new AwkSyntaxError(`calling undefined function ${call.name} at source line ${call.line}`, call.line);
            }
        }
        return program;
    }

    // ---- token helpers -------------------------------------------------

    private get tok(): Token { return this.tokens[this.i]; }
    private peek(n = 1): Token { return this.tokens[Math.min(this.i + n, this.tokens.length - 1)]; }

    private at(type: Token['type'], value?: string): boolean {
        const t = this.tok;
        return t.type === type && (value === undefined || t.value === value);
    }
    private atPunct(value: string): boolean { return this.at('PUNCT', value); }
    private atKeyword(value: string): boolean { return this.at('KEYWORD', value); }

    private next(): Token { return this.tokens[this.i++]; }

    private error(what?: string): never {
        const t = this.tok;
        const near = t.type === 'EOF' ? 'end of file' : t.type === 'NEWLINE' ? 'newline' : `'${t.value}'`;
        throw new AwkSyntaxError(`syntax error at source line ${t.line}${what ? `: ${what}` : ''} (near ${near})`, t.line);
    }

    private expectPunct(value: string): void {
        if (!this.atPunct(value)) this.error(`expected '${value}'`);
        this.i++;
    }

    private optNewlines(): void {
        while (this.at('NEWLINE')) this.i++;
    }

    private skipTerminators(): void {
        while (this.at('NEWLINE') || this.atPunct(';')) this.i++;
    }

    /** End of a simple statement: `;`, newline, or (unconsumed) `}` / end of program. */
    private endSimple(): void {
        if (this.atPunct(';') || this.at('NEWLINE')) { this.i++; return; }
        if (this.atPunct('}') || this.at('EOF')) return;
        this.error();
    }

    private atTerminator(): boolean {
        return this.atPunct(';') || this.at('NEWLINE') || this.atPunct('}') || this.at('EOF');
    }

    // ---- program items ------------------------------------------------

    private item(program: Program): void {
        if (this.atKeyword('function')) { this.functionDef(program); return; }
        if (this.atKeyword('BEGIN') || this.atKeyword('END')) {
            const which = this.next().value;
            this.ctx = which === 'BEGIN' ? 'begin' : 'end';
            if (!this.atPunct('{')) this.error(`${which} requires an action`);
            const action = this.block();
            this.ctx = 'rule';
            (which === 'BEGIN' ? program.begin : program.end).push(action);
            return;
        }
        const rule: Rule = {};
        if (!this.atPunct('{')) {
            rule.pattern = this.expr();
            if (this.atPunct(',')) {
                this.i++;
                this.optNewlines();
                rule.pattern2 = this.expr();
            }
        }
        if (this.atPunct('{')) rule.action = this.block();
        else if (!this.atTerminator()) this.error();
        program.rules.push(rule);
    }

    private functionDef(program: Program): void {
        this.i++;
        const nameTok = this.next();
        if (nameTok.type !== 'NAME' && nameTok.type !== 'FUNC_NAME') this.error('function name expected');
        const name = nameTok.value;
        if (program.functions.has(name)) throw new AwkSyntaxError(`function ${name} redefined at source line ${nameTok.line}`, nameTok.line);
        this.expectPunct('(');
        const params: string[] = [];
        this.optNewlines();
        while (!this.atPunct(')')) {
            const p = this.next();
            if (p.type !== 'NAME') { this.i--; this.error('parameter name expected'); }
            if (params.includes(p.value)) throw new AwkSyntaxError(`duplicate parameter ${p.value} at source line ${p.line}`, p.line);
            params.push(p.value);
            this.optNewlines();
            if (this.atPunct(',')) { this.i++; this.optNewlines(); } else if (!this.atPunct(')')) this.error();
        }
        this.i++;
        this.optNewlines();
        this.locals = new Map(params.map((p, idx) => [p, idx]));
        this.ctx = 'function';
        const def: FunctionDef = { name, params, body: this.block() };
        this.locals = null;
        this.ctx = 'rule';
        program.functions.set(name, def);
    }

    // ---- statements ----------------------------------------------------

    private block(): Stmt {
        this.expectPunct('{');
        const body: Stmt[] = [];
        for (;;) {
            this.skipTerminators();
            if (this.atPunct('}')) break;
            if (this.at('EOF')) this.error("missing '}'");
            body.push(this.statement());
        }
        this.i++;
        return { kind: 'block', body };
    }

    /** A statement used as a loop/if body, after optional newlines. */
    private body(): Stmt {
        this.optNewlines();
        return this.statement();
    }

    private loopBody(): Stmt {
        this.loops++;
        try { return this.body(); } finally { this.loops--; }
    }

    private statement(): Stmt {
        if (this.atPunct('{')) return this.block();
        if (this.atPunct(';')) { this.i++; return { kind: 'block', body: [] }; }
        if (this.at('KEYWORD')) {
            switch (this.tok.value) {
                case 'if': return this.ifStatement();
                case 'while': {
                    this.i++;
                    const cond = this.condition();
                    if (this.atPunct(';')) { this.i++; return { kind: 'while', cond, body: { kind: 'block', body: [] } }; }
                    return { kind: 'while', cond, body: this.loopBody() };
                }
                case 'do': {
                    this.i++;
                    const body = this.loopBody();
                    this.skipTerminators();
                    if (!this.atKeyword('while')) this.error("expected 'while'");
                    this.i++;
                    const cond = this.condition();
                    this.endSimple();
                    return { kind: 'do', body, cond };
                }
                case 'for': return this.forStatement();
            }
        }
        const stmt = this.simpleStatement();
        this.endSimple();
        return stmt;
    }

    private condition(): Expr {
        this.expectPunct('(');
        const cond = this.expr();
        this.expectPunct(')');
        return cond;
    }

    private ifStatement(): Stmt {
        this.i++;
        const cond = this.condition();
        const then = this.body();
        const save = this.i;
        this.skipTerminators();
        if (this.atKeyword('else')) {
            this.i++;
            return { kind: 'if', cond, then, else: this.body() };
        }
        this.i = save;
        return { kind: 'if', cond, then };
    }

    private forStatement(): Stmt {
        this.i++;
        this.expectPunct('(');
        // for (name in array)
        if (this.at('NAME') && this.peek().type === 'KEYWORD' && this.peek().value === 'in'
            && this.peek(2).type === 'NAME' && this.peek(3).type === 'PUNCT' && this.peek(3).value === ')') {
            const variable: LValue = { kind: 'var', ref: this.ref(this.next().value) };
            this.i++;
            const array = this.ref(this.next().value);
            this.i++;
            return { kind: 'forin', variable, array, body: this.loopBody() };
        }
        const init = this.atPunct(';') ? undefined : this.expr();
        this.expectPunct(';');
        this.optNewlines();
        const cond = this.atPunct(';') ? undefined : this.expr();
        this.expectPunct(';');
        this.optNewlines();
        const update = this.atPunct(')') ? undefined : this.expr();
        this.expectPunct(')');
        if (this.atPunct(';')) { this.i++; return { kind: 'for', init, cond, update, body: { kind: 'block', body: [] } }; }
        return { kind: 'for', init, cond, update, body: this.loopBody() };
    }

    private simpleStatement(): Stmt {
        if (this.at('KEYWORD')) {
            const kw = this.tok.value;
            switch (kw) {
                case 'print': case 'printf': return this.printStatement();
                case 'break': case 'continue':
                    if (this.loops === 0) this.error(`${kw} outside a loop`);
                    this.i++;
                    return { kind: kw };
                case 'next': case 'nextfile':
                    if (this.ctx === 'begin' || this.ctx === 'end') this.error(`${kw} used in BEGIN or END action`);
                    this.i++;
                    return { kind: kw };
                case 'exit':
                    this.i++;
                    return { kind: 'exit', value: this.atTerminator() ? undefined : this.expr() };
                case 'return':
                    if (this.ctx !== 'function') this.error('return outside function body');
                    this.i++;
                    return { kind: 'return', value: this.atTerminator() ? undefined : this.expr() };
                case 'delete': {
                    this.i++;
                    if (!this.at('NAME')) this.error('array name expected');
                    const array = this.ref(this.next().value);
                    if (this.atPunct('[')) {
                        this.i++;
                        const subs = this.exprList(']');
                        return { kind: 'delete', array, subs };
                    }
                    return { kind: 'delete', array };
                }
            }
        }
        return { kind: 'expr', expr: this.expr() };
    }

    private printStatement(): Stmt {
        const printf = this.next().value === 'printf';
        let args: Expr[] = [];
        if (!this.atTerminator() && !this.atPunct('>') && !this.atPunct('>>') && !this.atPunct('|')) {
            const saved = this.noGt;
            this.noGt = true;
            try {
                args = [this.expr()];
                while (this.atPunct(',')) {
                    this.i++;
                    this.optNewlines();
                    args.push(this.expr());
                }
            } finally {
                this.noGt = saved;
            }
            if (args.length === 1 && args[0].kind === 'group') args = args[0].exprs;
        }
        if (printf && args.length === 0) this.error('printf: no format');
        let redirect: Redirect | undefined;
        if (this.atPunct('>') || this.atPunct('>>') || this.atPunct('|')) {
            const mode = this.next().value as Redirect['mode'];
            const saved = this.noGt;
            this.noGt = true;
            try { redirect = { mode, target: this.concat() }; } finally { this.noGt = saved; }
        }
        return { kind: 'print', printf, args, redirect };
    }

    // ---- expressions ---------------------------------------------------

    private ref(name: string): NameRef {
        const local = this.locals?.get(name);
        return { name, local: local ?? -1 };
    }

    private isLvalue(e: Expr): e is LValue {
        return e.kind === 'var' || e.kind === 'index' || e.kind === 'field';
    }

    private exprList(close: string): Expr[] {
        const list: Expr[] = [];
        this.optNewlines();
        if (this.atPunct(close)) { this.i++; return list; }
        for (;;) {
            list.push(this.expr());
            this.optNewlines();
            if (this.atPunct(',')) { this.i++; this.optNewlines(); continue; }
            this.expectPunct(close);
            return list;
        }
    }

    /** Parses with `>` meaning comparison again (inside parentheses/brackets/calls). */
    private nested<T>(fn: () => T): T {
        const saved = this.noGt;
        this.noGt = false;
        try { return fn(); } finally { this.noGt = saved; }
    }

    expr(): Expr {
        const left = this.ternary();
        if (this.at('PUNCT') && ASSIGN_OPS.has(this.tok.value)) {
            if (!this.isLvalue(left)) this.error('assignment to non-lvalue');
            const op = this.next().value;
            this.optNewlines();
            return { kind: 'assign', op: op === '**=' ? '^=' : op, target: left, value: this.expr() };
        }
        return left;
    }

    private ternary(): Expr {
        const cond = this.or();
        if (!this.atPunct('?')) return cond;
        this.i++;
        this.optNewlines();
        const then = this.expr();
        this.optNewlines();
        this.expectPunct(':');
        this.optNewlines();
        return { kind: 'cond', cond, then, else: this.expr() };
    }

    private or(): Expr {
        let left = this.and();
        while (this.atPunct('||')) {
            this.i++;
            this.optNewlines();
            left = { kind: 'or', left, right: this.and() };
        }
        return left;
    }

    private and(): Expr {
        let left = this.inExpr();
        while (this.atPunct('&&')) {
            this.i++;
            this.optNewlines();
            left = { kind: 'and', left, right: this.inExpr() };
        }
        return left;
    }

    private inExpr(): Expr {
        let left = this.match();
        while (this.atKeyword('in')) {
            this.i++;
            if (!this.at('NAME')) this.error('array name expected after in');
            const array = this.ref(this.next().value);
            left = { kind: 'in', subs: left.kind === 'group' ? left.exprs : [left], array };
        }
        return left;
    }

    private match(): Expr {
        let left = this.comparison();
        while (this.atPunct('~') || this.atPunct('!~')) {
            const negate = this.next().value === '!~';
            left = { kind: 'match', negate, left, right: this.comparison() };
        }
        return left;
    }

    private comparison(): Expr {
        const left = this.pipeGetline();
        const t = this.tok;
        if (t.type === 'PUNCT' && COMPARE_OPS.has(t.value) && !(t.value === '>' && this.noGt)) {
            this.i++;
            return { kind: 'compare', op: t.value as any, left, right: this.pipeGetline() };
        }
        return left;
    }

    private pipeGetline(): Expr {
        let left = this.concat();
        while (this.atPunct('|') && this.peek().type === 'KEYWORD' && this.peek().value === 'getline') {
            this.i += 2;
            left = { kind: 'getline', source: 'cmd', src: left, target: this.optionalLvalue() };
        }
        return left;
    }

    private startsConcat(): boolean {
        const t = this.tok;
        switch (t.type) {
            case 'NUMBER': case 'STRING': case 'ERE': case 'NAME': case 'FUNC_NAME': case 'BUILTIN': return true;
            case 'PUNCT': return t.value === '$' || t.value === '(' || t.value === '++' || t.value === '--';
            default: return false;
        }
    }

    private concat(): Expr {
        let left = this.additive();
        while (this.startsConcat()) {
            left = { kind: 'concat', left, right: this.additive() };
        }
        return left;
    }

    private additive(): Expr {
        let left = this.multiplicative();
        while (this.atPunct('+') || this.atPunct('-')) {
            const op = this.next().value as '+' | '-';
            left = { kind: 'binary', op, left, right: this.multiplicative() };
        }
        return left;
    }

    private multiplicative(): Expr {
        let left = this.unary();
        while (this.atPunct('*') || this.atPunct('/') || this.atPunct('%')) {
            const op = this.next().value as '*' | '/' | '%';
            left = { kind: 'binary', op, left, right: this.unary() };
        }
        return left;
    }

    private unary(): Expr {
        if (this.atPunct('!') || this.atPunct('-') || this.atPunct('+')) {
            const op = this.next().value as '!' | '-' | '+';
            return { kind: 'unary', op, expr: this.unary() };
        }
        return this.power();
    }

    private power(): Expr {
        const base = this.postfix();
        if (this.atPunct('^') || this.atPunct('**')) {
            this.i++;
            return { kind: 'binary', op: '^', left: base, right: this.unary() };
        }
        return base;
    }

    private postfix(): Expr {
        const e = this.primary();
        if ((this.atPunct('++') || this.atPunct('--')) && this.isLvalue(e)) {
            return { kind: 'incdec', op: this.next().value as '++' | '--', prefix: false, target: e };
        }
        return e;
    }

    /** The operand of `$`: a primary, an increment, or a signed operand (no postfix ++). */
    private fieldOperand(): Expr {
        if (this.atPunct('-') || this.atPunct('+') || this.atPunct('!')) {
            const op = this.next().value as '!' | '-' | '+';
            return { kind: 'unary', op, expr: this.fieldOperand() };
        }
        return this.primary();
    }

    private optionalLvalue(): LValue | undefined {
        if (this.atPunct('$')) {
            this.i++;
            return { kind: 'field', index: this.fieldOperand() };
        }
        if (this.at('NAME')) {
            const ref = this.ref(this.next().value);
            if (this.atPunct('[')) {
                this.i++;
                return { kind: 'index', ref, subs: this.nested(() => this.exprList(']')) };
            }
            return { kind: 'var', ref };
        }
        return undefined;
    }

    private primary(): Expr {
        const t = this.tok;
        switch (t.type) {
            case 'NUMBER': this.i++; return { kind: 'num', value: t.num! };
            case 'STRING': this.i++; return { kind: 'str', value: t.value };
            case 'ERE': this.i++; return { kind: 'regex', source: t.value };
            case 'NAME': {
                this.i++;
                const ref = this.ref(t.value);
                if (this.atPunct('[')) {
                    this.i++;
                    return { kind: 'index', ref, subs: this.nested(() => this.exprList(']')) };
                }
                return { kind: 'var', ref };
            }
            case 'FUNC_NAME': {
                this.i++;
                this.expectPunct('(');
                const args = this.nested(() => this.exprList(')'));
                this.calls.push({ name: t.value, line: t.line });
                return { kind: 'call', name: t.value, args, line: t.line };
            }
            case 'BUILTIN': {
                this.i++;
                if (this.atPunct('(')) {
                    this.i++;
                    return { kind: 'builtin', name: t.value, args: this.nested(() => this.exprList(')')) };
                }
                if (t.value === 'length') return { kind: 'builtin', name: 'length', args: [] };
                return this.error(`${t.value} requires arguments`);
            }
            case 'KEYWORD':
                if (t.value === 'getline') {
                    this.i++;
                    const target = this.optionalLvalue();
                    if (this.atPunct('<')) {
                        this.i++;
                        return { kind: 'getline', source: 'file', target, src: this.postfix() };
                    }
                    return { kind: 'getline', source: 'main', target };
                }
                break;
            case 'PUNCT':
                switch (t.value) {
                    case '(': {
                        this.i++;
                        const list = this.nested(() => this.exprList(')'));
                        if (list.length === 0) this.error('empty expression');
                        return list.length === 1 ? list[0] : { kind: 'group', exprs: list };
                    }
                    case '$':
                        this.i++;
                        return { kind: 'field', index: this.fieldOperand() };
                    case '++': case '--': {
                        this.i++;
                        const target = this.primary();
                        if (!this.isLvalue(target)) this.error(`${t.value} requires an lvalue`);
                        return { kind: 'incdec', op: t.value as '++' | '--', prefix: true, target };
                    }
                    case '-': case '+': case '!':
                        return this.unary();
                }
        }
        this.error();
    }
}
