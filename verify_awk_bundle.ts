
// --- MOCKS ---

interface ICommand {
    execute(args: string[], context: any, state: any): any;
}

interface FileSystemService {
    readFile(path: string): string;
}

const mockFs = {
    readFile: (path: string) => {
        if (path === '/data') return '10 20\n30 40';
        if (path === '/f') return 'a b\nc d';
        throw new Error('Not found ' + path);
    }
} as any as FileSystemService;

// --- LEXER ---

enum AwkTokenType {
    BEGIN = 'BEGIN', END = 'END', PRINT = 'PRINT', IF = 'IF', ELSE = 'ELSE',
    IDENTIFIER = 'IDENTIFIER', NUMBER = 'NUMBER', STRING = 'STRING', REGEX = 'REGEX',
    FIELD_REF = 'FIELD_REF',
    PLUS = 'PLUS', MINUS = 'MINUS', STAR = 'STAR', SLASH = 'SLASH', PERCENT = 'PERCENT', CARET = 'CARET',
    ASSIGN = 'ASSIGN', PLUS_ASSIGN = 'PLUS_ASSIGN', MINUS_ASSIGN = 'MINUS_ASSIGN', STAR_ASSIGN = 'STAR_ASSIGN', SLASH_ASSIGN = 'SLASH_ASSIGN', PERCENT_ASSIGN = 'PERCENT_ASSIGN', CARET_ASSIGN = 'CARET_ASSIGN', INC = 'INC', DEC = 'DEC',
    EQ = 'EQ', NEQ = 'NEQ', LT = 'LT', GT = 'GT', LTE = 'LTE', GTE = 'GTE', MATCH = 'MATCH', NOT_MATCH = 'NOT_MATCH',
    AND = 'AND', OR = 'OR', NOT = 'NOT',
    LPAREN = 'LPAREN', RPAREN = 'RPAREN', LBRACE = 'LBRACE', RBRACE = 'RBRACE', LBRACKET = 'LBRACKET', RBRACKET = 'RBRACKET',
    COMMA = 'COMMA', SEMI = 'SEMI', NEWLINE = 'NEWLINE', EOF = 'EOF'
}

interface AwkToken { type: AwkTokenType; value: string; line: number; col: number; }

class AwkLexer {
    private pos = 0; private line = 1; private col = 1; private source: string;
    constructor(source: string) { this.source = source; }
    tokenize(): AwkToken[] {
        const tokens: AwkToken[] = [];
        this.pos = 0; this.line = 1; this.col = 1;
        while (this.pos < this.source.length) {
            const char = this.peek();
            if (/\s/.test(char)) {
                if (char === '\n') { tokens.push(this.token(AwkTokenType.NEWLINE, '\n')); this.advance(); this.line++; this.col = 1; }
                else { this.advance(); }
                continue;
            }
            if (char === '#') { while (this.pos < this.source.length && this.peek() !== '\n') this.advance(); continue; }
            if (char === '"') { tokens.push(this.readString()); continue; }
            if (char === '/') {
                const last = tokens.length > 0 ? tokens[tokens.length - 1] : null;
                const isDiv = last && (last.type === AwkTokenType.IDENTIFIER || last.type === AwkTokenType.NUMBER || last.type === AwkTokenType.STRING || last.type === AwkTokenType.RPAREN || last.type === AwkTokenType.RBRACKET || last.type === AwkTokenType.FIELD_REF);
                if (isDiv) {
                    if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.SLASH_ASSIGN, '/=')); }
                    else { this.advance(); tokens.push(this.token(AwkTokenType.SLASH, '/')); }
                } else { tokens.push(this.readRegex()); }
                continue;
            }
            if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(this.peek(1)))) { tokens.push(this.readNumber()); continue; }
            if (/[a-zA-Z_]/.test(char)) { tokens.push(this.readIdentifier()); continue; }
            if (char === '$') { this.advance(); tokens.push(this.token(AwkTokenType.FIELD_REF, '$')); continue; }
            if (char === '+') { if (this.peek(1) === '+') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.INC, '++')); continue; } if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.PLUS_ASSIGN, '+=')); continue; } this.advance(); tokens.push(this.token(AwkTokenType.PLUS, '+')); continue; }
            if (char === '-') { if (this.peek(1) === '-') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.DEC, '--')); continue; } if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.MINUS_ASSIGN, '-=')); continue; } this.advance(); tokens.push(this.token(AwkTokenType.MINUS, '-')); continue; }
            if (char === '*') { if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.STAR_ASSIGN, '*=')); continue; } this.advance(); tokens.push(this.token(AwkTokenType.STAR, '*')); continue; }
            if (char === '%') { if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.PERCENT_ASSIGN, '%=')); continue; } this.advance(); tokens.push(this.token(AwkTokenType.PERCENT, '%')); continue; }
            if (char === '^') { if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.CARET_ASSIGN, '^=')); continue; } this.advance(); tokens.push(this.token(AwkTokenType.CARET, '^')); continue; }
            if (char === '=') { if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.EQ, '==')); continue; } this.advance(); tokens.push(this.token(AwkTokenType.ASSIGN, '=')); continue; }
            if (char === '!') { if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.NEQ, '!=')); continue; } if (this.peek(1) === '~') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.NOT_MATCH, '!~')); continue; } this.advance(); tokens.push(this.token(AwkTokenType.NOT, '!')); continue; }
            if (char === '<') { if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.LTE, '<=')); continue; } this.advance(); tokens.push(this.token(AwkTokenType.LT, '<')); continue; }
            if (char === '>') { if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.GTE, '>=')); continue; } this.advance(); tokens.push(this.token(AwkTokenType.GT, '>')); continue; }
            if (char === '&' && this.peek(1) === '&') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.AND, '&&')); continue; }
            if (char === '|' && this.peek(1) === '|') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.OR, '||')); continue; }
            if (char === '~') { this.advance(); tokens.push(this.token(AwkTokenType.MATCH, '~')); continue; }
            switch (char) {
                case '(': this.advance(); tokens.push(this.token(AwkTokenType.LPAREN, '(')); continue;
                case ')': this.advance(); tokens.push(this.token(AwkTokenType.RPAREN, ')')); continue;
                case '{': this.advance(); tokens.push(this.token(AwkTokenType.LBRACE, '{')); continue;
                case '}': this.advance(); tokens.push(this.token(AwkTokenType.RBRACE, '}')); continue;
                case '[': this.advance(); tokens.push(this.token(AwkTokenType.LBRACKET, '[')); continue;
                case ']': this.advance(); tokens.push(this.token(AwkTokenType.RBRACKET, ']')); continue;
                case ',': this.advance(); tokens.push(this.token(AwkTokenType.COMMA, ',')); continue;
                case ';': this.advance(); tokens.push(this.token(AwkTokenType.SEMI, ';')); continue;
            }
            throw new Error(`AwkLexer: Unexpected character '${char}' at ${this.line}:${this.col}`);
        }
        tokens.push(this.token(AwkTokenType.EOF, ''));
        return tokens;
    }
    private peek(offset = 0): string { return this.source[this.pos + offset] || ''; }
    private advance(): string { const c = this.source[this.pos++]; this.col++; return c; }
    private token(type: AwkTokenType, value: string): AwkToken { return { type, value, line: this.line, col: this.col - value.length }; }
    private readString(): AwkToken {
        this.advance(); let str = '';
        while (this.pos < this.source.length && this.peek() !== '"') {
            if (this.peek() === '\\') { this.advance(); str += this.advance(); } else { str += this.advance(); }
        }
        if (this.peek() !== '"') throw new Error("Unterminated string");
        this.advance(); return this.token(AwkTokenType.STRING, str);
    }
    private readRegex(): AwkToken {
        this.advance(); let str = '';
        while (this.pos < this.source.length) {
            if (this.peek() === '/' && this.source[this.pos - 1] !== '\\') break;
            str += this.advance();
        }
        if (this.peek() !== '/') throw new Error("Unterminated regex");
        this.advance(); return this.token(AwkTokenType.REGEX, str);
    }
    private readNumber(): AwkToken { let num = ''; while (this.pos < this.source.length && /[0-9.]/.test(this.peek())) num += this.advance(); return this.token(AwkTokenType.NUMBER, num); }
    private readIdentifier(): AwkToken {
        let id = ''; while (this.pos < this.source.length && /[a-zA-Z0-9_]/.test(this.peek())) id += this.advance();
        switch (id) {
            case 'BEGIN': return this.token(AwkTokenType.BEGIN, id);
            case 'END': return this.token(AwkTokenType.END, id);
            case 'print': return this.token(AwkTokenType.PRINT, id);
            case 'if': return this.token(AwkTokenType.IF, id);
            case 'else': return this.token(AwkTokenType.ELSE, id);
            case 'length': return this.token(AwkTokenType.IDENTIFIER, id);
        }
        return this.token(AwkTokenType.IDENTIFIER, id);
    }
}

// --- PARSER ---

class AwkParser {
    private tokens: AwkToken[]; private pos = 0;
    constructor(tokens: AwkToken[]) { this.tokens = tokens; }
    parse(): any {
        const program: any = { type: 'Program', beginBlocks: [], endBlocks: [], patternActions: [] };
        while (this.peek().type !== AwkTokenType.EOF) {
            while (this.match(AwkTokenType.NEWLINE));
            if (this.peek().type === AwkTokenType.EOF) break;
            if (this.match(AwkTokenType.BEGIN)) { program.beginBlocks.push(this.parseBlock()); }
            else if (this.match(AwkTokenType.END)) { program.endBlocks.push(this.parseBlock()); }
            else if (this.peek().type === AwkTokenType.LBRACE) { program.patternActions.push({ type: 'PatternAction', action: this.parseBlock() }); }
            else {
                const pattern = this.parseExpression();
                if (this.peek().type === AwkTokenType.LBRACE) { program.patternActions.push({ type: 'PatternAction', pattern: pattern, action: this.parseBlock() }); }
                else { program.patternActions.push({ type: 'PatternAction', pattern: pattern, action: { type: 'Block', statements: [{ type: 'Print', args: [] }] } }); }
            }
        }
        return program;
    }
    private parseBlock(): any {
        this.consume(AwkTokenType.LBRACE, "Expected '{'"); const stmts: any[] = [];
        while (this.peek().type !== AwkTokenType.RBRACE && this.peek().type !== AwkTokenType.EOF) {
            while (this.match(AwkTokenType.NEWLINE) || this.match(AwkTokenType.SEMI));
            if (this.peek().type === AwkTokenType.RBRACE) break;
            stmts.push(this.parseStatement());
            while (this.match(AwkTokenType.SEMI));
        }
        this.consume(AwkTokenType.RBRACE, "Expected '}'"); return { type: 'Block', statements: stmts };
    }
    private parseStatement(): any {
        const token = this.peek();
        if (token.type === AwkTokenType.PRINT) {
            this.advance(); const args: any[] = [];
            if (!this.isStmtEnd()) { do { args.push(this.parseExpression()); } while (this.match(AwkTokenType.COMMA)); }
            return { type: 'Print', args };
        } else if (token.type === AwkTokenType.IF) {
            this.advance(); this.consume(AwkTokenType.LPAREN, "Expected '('"); const cond = this.parseExpression();
            this.consume(AwkTokenType.RPAREN, "Expected ')'");
            const thenB = this.parseStatement(); let elseB: any;
            if (this.match(AwkTokenType.ELSE)) elseB = this.parseStatement();
            return { type: 'If', condition: cond, thenBranch: thenB, elseBranch: elseB };
        } else if (token.type === AwkTokenType.LBRACE) { return this.parseExprStatement(); }
        return this.parseExprStatement();
    }
    private parseExprStatement(): any { return { type: 'ExprStmt', expr: this.parseExpression() }; }
    private parseExpression(): any { return this.parseAssignment(); }
    private parseAssignment(): any {
        let left = this.parseLogicalOr();
        if (this.match(AwkTokenType.ASSIGN)) {
            const right = this.parseAssignment();
            if (left.type !== 'Variable' && left.type !== 'FieldAccess') throw new Error("Invalid assignment");
            return { type: 'Assign', left: left, op: '=', right };
        }
        return left;
    }
    private parseLogicalOr(): any { let left = this.parseLogicalAnd(); while (this.match(AwkTokenType.OR)) { left = { type: 'Binary', left, op: '||', right: this.parseLogicalAnd() }; } return left; }
    private parseLogicalAnd(): any { let left = this.parseEquality(); while (this.match(AwkTokenType.AND)) { left = { type: 'Binary', left, op: '&&', right: this.parseEquality() }; } return left; }
    private parseEquality(): any {
        let left = this.parseComparison();
        while (true) { if (this.match(AwkTokenType.EQ)) left = { type: 'Binary', left, op: '==', right: this.parseComparison() }; else if (this.match(AwkTokenType.NEQ)) left = { type: 'Binary', left, op: '!=', right: this.parseComparison() }; else break; }
        return left;
    }
    private parseComparison(): any {
        let left = this.parseConcat();
        while (true) { if (this.match(AwkTokenType.LT)) left = { type: 'Binary', left, op: '<', right: this.parseConcat() }; else if (this.match(AwkTokenType.GT)) left = { type: 'Binary', left, op: '>', right: this.parseConcat() }; else if (this.match(AwkTokenType.MATCH)) left = { type: 'Binary', left, op: '~', right: this.parseConcat() }; else break; }
        return left;
    }
    private parseConcat(): any { let left = this.parseAdditive(); while (this.isStartOfExpression()) { left = { type: 'Binary', left, op: 'concat', right: this.parseAdditive() }; } return left; }
    private parseAdditive(): any { let left = this.parseMultiplicative(); while (true) { if (this.match(AwkTokenType.PLUS)) left = { type: 'Binary', left, op: '+', right: this.parseMultiplicative() }; else if (this.match(AwkTokenType.MINUS)) left = { type: 'Binary', left, op: '-', right: this.parseMultiplicative() }; else break; } return left; }
    private parseMultiplicative(): any { let left = this.parseUnary(); while (true) { if (this.match(AwkTokenType.STAR)) left = { type: 'Binary', left, op: '*', right: this.parseUnary() }; else if (this.match(AwkTokenType.SLASH)) left = { type: 'Binary', left, op: '/', right: this.parseUnary() }; else break; } return left; }
    private parseUnary(): any {
        if (this.match(AwkTokenType.FIELD_REF)) { return { type: 'FieldAccess', index: this.parseUnary() }; }
        if (this.match(AwkTokenType.NOT)) return { type: 'Unary', op: '!', operand: this.parseUnary() };
        if (this.match(AwkTokenType.MINUS)) return { type: 'Unary', op: '-', operand: this.parseUnary() };
        return this.parsePrimary();
    }
    private parsePrimary(): any {
        const token = this.peek();
        if (this.match(AwkTokenType.NUMBER)) return { type: 'Literal', value: parseFloat(token.value), valueType: 'number' };
        if (this.match(AwkTokenType.STRING)) return { type: 'Literal', value: token.value, valueType: 'string' };
        if (this.match(AwkTokenType.REGEX)) return { type: 'Literal', value: token.value, valueType: 'regex' };
        if (this.match(AwkTokenType.IDENTIFIER)) return { type: 'Variable', name: token.value };
        if (this.match(AwkTokenType.LPAREN)) { const expr = this.parseExpression(); this.consume(AwkTokenType.RPAREN, "Expected ')'"); return expr; }
        throw new Error(`Unexpected token: ${token.type} (${token.value})`);
    }
    private isStartOfExpression(): boolean { const t = this.peek().type; return t === AwkTokenType.IDENTIFIER || t === AwkTokenType.NUMBER || t === AwkTokenType.STRING || t === AwkTokenType.FIELD_REF || t === AwkTokenType.LPAREN || t === AwkTokenType.NOT || t === AwkTokenType.MINUS || t === AwkTokenType.REGEX; }
    private isStmtEnd(): boolean { const t = this.peek().type; return t === AwkTokenType.SEMI || t === AwkTokenType.NEWLINE || t === AwkTokenType.RBRACE || t === AwkTokenType.EOF; }
    private peek(offset = 0): AwkToken { return this.tokens[this.pos + offset] || { type: AwkTokenType.EOF, value: '', line: -1, col: -1 }; }
    private advance(): AwkToken { return this.tokens[this.pos++] || { type: AwkTokenType.EOF, value: '', line: -1, col: -1 }; }
    private match(type: AwkTokenType): boolean { if (this.peek().type === type) { this.advance(); return true; } return false; }
    private consume(type: AwkTokenType, err: string) { if (!this.match(type)) throw new Error(err); }
}

// --- INTERPRETER ---

class AwkInterpreter {
    private fs = ' '; private nr = 0; private nf = 0;
    private vars: Map<string, any> = new Map();
    private fields: string[] = [];
    private record = '';
    private output = '';
    constructor() { this.vars.set('FS', ' '); }
    execute(program: any, input: string): string {
        this.output = ''; this.nr = 0;
        for (const block of program.beginBlocks) this.executeBlock(block);
        if (input) {
            const lines = input.split('\n');
            for (const line of lines) {
                this.record = line; this.nr++; this.updateFields(line);
                this.vars.set('NR', this.nr); this.vars.set('NF', this.nf);
                for (const pa of program.patternActions) { if (this.evaluatePattern(pa.pattern)) this.executeBlock(pa.action); }
            }
        }
        for (const block of program.endBlocks) this.executeBlock(block);
        return this.output;
    }
    private updateFields(line: string) {
        this.fs = this.vars.get('FS');
        if (this.fs === ' ') { this.fields = line.trim().split(/\s+/); if (this.fields.length === 1 && this.fields[0] === '') this.fields = []; }
        else { this.fields = line.split(this.fs); }
        this.nf = this.fields.length;
    }
    private executeBlock(block: any) { for (const stmt of block.statements) this.executeStatement(stmt); }
    private executeStatement(stmt: any) {
        if (stmt.type === 'Print') {
            const args = stmt.args.map((arg: any) => this.evaluate(arg));
            if (args.length === 0) this.output += this.record + '\n';
            else { const ofs = this.vars.has('OFS') ? this.vars.get('OFS') : ' '; this.output += args.join(ofs) + '\n'; }
        } else if (stmt.type === 'ExprStmt') { this.evaluate(stmt.expr); }
        else if (stmt.type === 'If') { if (this.toBoolean(this.evaluate(stmt.condition))) this.executeOrStatement(stmt.thenBranch); else if (stmt.elseBranch) this.executeOrStatement(stmt.elseBranch); }
    }
    private executeOrStatement(stmt: any) { this.executeStatement(stmt); }
    private evaluatePattern(pattern?: any): boolean { if (!pattern) return true; return this.toBoolean(this.evaluate(pattern)); }
    private evaluate(expr: any): any {
        switch (expr.type) {
            case 'Literal': return expr.value;
            case 'Variable': return this.getVar(expr.name);
            case 'FieldAccess': { const index = Number(this.evaluate(expr.index)); if (index === 0) return this.record; return this.fields[index - 1] || ''; }
            case 'Binary': return this.evaluateBinary(expr.left, expr.op, expr.right);
            case 'Unary': return this.evaluateUnary(expr.op, expr.operand);
            case 'Assign': return this.evaluateAssign(expr.left, expr.op, expr.right);
            default: return '';
        }
    }
    private evaluateBinary(left: any, op: string, right: any): any {
        const l = this.evaluate(left); const r = this.evaluate(right);
        if (op === 'concat') return String(l) + String(r);
        const ln = Number(l); const rn = Number(r);
        const lisN = !isNaN(ln) && String(l).trim() !== ''; const risN = !isNaN(rn) && String(r).trim() !== '';
        if (lisN && risN) {
            switch (op) { case '+': return ln + rn; case '-': return ln - rn; case '*': return ln * rn; case '/': return ln / rn; case '%': return ln % rn; case '^': return Math.pow(ln, rn); case '<': return ln < rn; case '>': return ln > rn; case '<=': return ln <= rn; case '>=': return ln >= rn; case '==': return ln === rn; case '!=': return ln !== rn; }
        }
        switch (op) {
            case '==': return String(l) === String(r); case '!=': return String(l) !== String(r); case '~': return new RegExp(String(r)).test(String(l)); case '!~': return !new RegExp(String(r)).test(String(l));
            case '+': return ln + rn; case '-': return ln - rn; case '*': return ln * rn; case '/': return ln / rn; case '%': return ln % rn;
        }
        return 0;
    }
    private evaluateUnary(op: string, operand: any): any { const val = this.evaluate(operand); if (op === '!') return !this.toBoolean(val); if (op === '-') return -Number(val); return val; }
    private evaluateAssign(left: any, op: string, rightExpr: any): any { const val = this.evaluate(rightExpr); if (left.type === 'Variable') this.vars.set(left.name, val); return val; }
    private getVar(name: string): any { if (name === 'NR') return this.nr; if (name === 'NF') return this.nf; if (name === 'FS') return this.fs; return this.vars.get(name) || ''; }
    private toBoolean(val: any): boolean {
        if (typeof val === 'number') return val !== 0;
        if (typeof val === 'string') { if (!isNaN(Number(val))) return Number(val) !== 0; return val.length > 0; }
        return !!val;
    }
}

// --- AWK COMMAND ---

class AwkCommand {
    private fs: FileSystemService;
    constructor(fs: FileSystemService) { this.fs = fs; }

    execute(args: string[], context: any, state: any): any {
        const input = context.stdin;
        let program = '';
        const files: string[] = [];
        let fieldSeparator = ' ';

        let skipNext = false;
        for (let i = 0; i < args.length; i++) {
            if (skipNext) { skipNext = false; continue; }
            const arg = args[i];
            if (arg.startsWith('-F')) {
                if (arg.length > 2) { fieldSeparator = arg.substring(2); }
                else if (i + 1 < args.length) { fieldSeparator = args[i + 1]; skipNext = true; }
            } else if (!program && !arg.startsWith('-')) { program = arg; }
            else if (arg.startsWith('-')) { }
            else { files.push(arg); }
        }

        if (!program) return { output: 'awk: missing program', newState: state, exitCode: 1 };
        if ((program.startsWith("'") && program.endsWith("'")) || (program.startsWith('"') && program.endsWith('"'))) program = program.slice(1, -1);

        try {
            const lexer = new AwkLexer(program);
            const tokens = lexer.tokenize();
            const parser = new AwkParser(tokens);
            const ast = parser.parse();
            const interpreter = new AwkInterpreter();

            if (fieldSeparator !== ' ') {
                program = `BEGIN { FS="${fieldSeparator}" } ` + program;
                const lexer2 = new AwkLexer(program);
                const tokens2 = lexer2.tokenize();
                const parser2 = new AwkParser(tokens2);
                const ast2 = parser2.parse();

                let content = '';
                if (files.length > 0) {
                    for (const file of files) { content += this.fs.readFile(file) + '\n'; }
                    if (content.endsWith('\n')) content = content.slice(0, -1);
                } else if (input !== undefined) { content = input; }
                const output = interpreter.execute(ast2, content);
                return { output: output.trimEnd(), newState: state, exitCode: 0 };
            } else {
                let content = '';
                if (files.length > 0) {
                    for (const file of files) { content += this.fs.readFile(file) + '\n'; }
                    if (content.endsWith('\n')) content = content.slice(0, -1);
                } else if (input !== undefined) { content = input; }
                const output = interpreter.execute(ast, content);
                return { output: output.trimEnd(), newState: state, exitCode: 0 };
            }
        } catch (e: any) {
            return { output: `awk: ${e.message}`, newState: state, exitCode: 1 };
        }
    }
}

// --- VERIFICATION RUNNER ---

const cmd = new AwkCommand(mockFs);
const state = {};

function createCtx(args: string[], input: string | undefined): any {
    return { stdin: input };
}

async function runTests() {
    console.log('--- Verifying AwkCommand Bundle ---');
    const tests = [
        { name: 'Basic Print', args: ["{print $1}"], input: "10 20", expected: "10" },
        { name: 'Field Access', args: ["{print $2}"], input: "10 20", expected: "20" },
        { name: 'Multiple Lines', args: ["{print $1}"], input: "10 20\n30 40", expected: "10\n30" },
        { name: 'String Concat', args: ["{print $1 $2}"], input: "10 20", expected: "1020" },
        { name: 'Comma OFS', args: ["{print $1, $2}"], input: "10 20", expected: "10 20" },
        { name: 'BEGIN Block', args: ["BEGIN {print \"start\"}"], input: "", expected: "start" },
        { name: 'END Block', args: ["END {print \"end\"}"], input: "", expected: "end" },
        { name: 'NR NF', args: ["{print NR, NF}"], input: "a b\nc d e", expected: "1 2\n2 3" },
        { name: 'Custom FS', args: ["-F:", "{print $2}"], input: "a:b\nc:d", expected: "b\nd" },
        { name: 'Arithmetic', args: ["{print $1 + $2}"], input: "10 20", expected: "30" },
        { name: 'Comparison', args: ["{if ($1 > 15) print \"yes\"; else print \"no\"}"], input: "10\n20", expected: "no\nyes" }
    ];

    let passed = 0;
    for (const t of tests) {
        try {
            const res = cmd.execute(t.args, createCtx(t.args, t.input), state);
            if (res.output === t.expected) { console.log(`PASS: ${t.name}`); passed++; }
            else { console.log(`FAIL: ${t.name}\n  Exp: ${JSON.stringify(t.expected)}\n  Act: ${JSON.stringify(res.output)}`); }
        } catch (e) {
            console.log(`FAIL: ${t.name} (Exception)`, e);
        }
    }
    console.log(`\nResult: ${passed}/${tests.length} passed.`);
}

runTests();
