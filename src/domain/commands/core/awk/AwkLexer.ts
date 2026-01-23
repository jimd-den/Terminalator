
/**
 * AwkLexer - Domain Layer
 *
 * Tokenizes the input program string for the Awk interpreter.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance) - Single pass tokenization
 */

export enum AwkTokenType {
    BEGIN = 'BEGIN',
    END = 'END',
    PRINT = 'PRINT',
    IF = 'IF',
    ELSE = 'ELSE',
    WHILE = 'WHILE',
    DO = 'DO',
    FOR = 'FOR',
    IN = 'IN',
    BREAK = 'BREAK',
    CONTINUE = 'CONTINUE',
    NEXT = 'NEXT',
    EXIT = 'EXIT',
    FUNCTION = 'FUNCTION',
    RETURN = 'RETURN',

    // Identifiers & Values
    IDENTIFIER = 'IDENTIFIER', // vars
    NUMBER = 'NUMBER',
    STRING = 'STRING',
    REGEX = 'REGEX',

    // Fields
    FIELD_REF = 'FIELD_REF', // $0, $1, $i

    // Operators
    PLUS = 'PLUS',       // +
    MINUS = 'MINUS',      // -
    STAR = 'STAR',       // *
    SLASH = 'SLASH',      // /
    PERCENT = 'PERCENT',    // %
    CARET = 'CARET',      // ^
    ASSIGN = 'ASSIGN',     // =
    PLUS_ASSIGN = 'PLUS_ASSIGN', // +=
    MINUS_ASSIGN = 'MINUS_ASSIGN', // -=
    STAR_ASSIGN = 'STAR_ASSIGN', // *=
    SLASH_ASSIGN = 'SLASH_ASSIGN', // /=
    PERCENT_ASSIGN = 'PERCENT_ASSIGN', // %=
    CARET_ASSIGN = 'CARET_ASSIGN', // ^=
    INC = 'INC',        // ++
    DEC = 'DEC',        // --

    // Comparison
    EQ = 'EQ', // ==
    NEQ = 'NEQ', // !=
    LT = 'LT', // <
    GT = 'GT', // >
    LTE = 'LTE', // <=
    GTE = 'GTE', // >=
    MATCH = 'MATCH', // ~
    NOT_MATCH = 'NOT_MATCH', // !~

    // Logic
    AND = 'AND', // &&
    OR = 'OR', // ||
    NOT = 'NOT', // !

    // Punctuation
    LPAREN = 'LPAREN', // (
    RPAREN = 'RPAREN', // )
    LBRACE = 'LBRACE', // {
    RBRACE = 'RBRACE', // }
    LBRACKET = 'LBRACKET', // [
    RBRACKET = 'RBRACKET', // ]
    COMMA = 'COMMA', // ,
    SEMI = 'SEMI', // ;
    NEWLINE = 'NEWLINE', // \n

    EOF = 'EOF'
}

export interface AwkToken {
    type: AwkTokenType;
    value: string;
    line: number;
    col: number;
}

export class AwkLexer {
    private pos = 0;
    private line = 1;
    private col = 1;
    private source: string;

    constructor(source: string) {
        this.source = source;
    }

    tokenize(): AwkToken[] {
        const tokens: AwkToken[] = [];
        this.pos = 0;
        this.line = 1;
        this.col = 1;

        while (this.pos < this.source.length) {
            const char = this.peek();

            if (/\s/.test(char)) {
                if (char === '\n') {
                    tokens.push(this.token(AwkTokenType.NEWLINE, '\n'));
                    this.advance();
                    this.line++;
                    this.col = 1;
                } else {
                    this.advance();
                }
                continue;
            }

            if (char === '#') {
                while (this.pos < this.source.length && this.peek() !== '\n') {
                    this.advance();
                }
                continue;
            }

            if (char === '"') {
                tokens.push(this.readString());
                continue;
            }

            if (char === '/') {
                // Determine if regex or division.
                // Regex usually follows: ~ !~ ( , { && ||
                // Simplified: If previous token was operator or keyword or start, likely regex.
                // Or try to parse as regex, fallback to slash?
                // For now, let's lookahead properly or handle in parser context?
                // Lexer context is hard.
                // Heuristic: If last token was IDENTIFIER or NUMBER or STRING or RPAREN or RBRACKET, it's division.
                // Otherwise Regex.
                const last = tokens.length > 0 ? tokens[tokens.length - 1] : null;
                const isDiv = last && (
                    last.type === AwkTokenType.IDENTIFIER ||
                    last.type === AwkTokenType.NUMBER ||
                    last.type === AwkTokenType.STRING ||
                    last.type === AwkTokenType.RPAREN ||
                    last.type === AwkTokenType.RBRACKET ||
                    last.type === AwkTokenType.FIELD_REF
                );

                if (isDiv) {
                    if (this.peek(1) === '=') {
                        this.advance(); this.advance();
                        tokens.push(this.token(AwkTokenType.SLASH_ASSIGN, '/='));
                    } else {
                        this.advance();
                        tokens.push(this.token(AwkTokenType.SLASH, '/'));
                    }
                } else {
                    tokens.push(this.readRegex());
                }
                continue;
            }

            if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(this.peek(1)))) {
                tokens.push(this.readNumber());
                continue;
            }

            if (/[a-zA-Z_]/.test(char)) {
                tokens.push(this.readIdentifier());
                continue;
            }

            if (char === '$') {
                this.advance();
                // Field Ref usually followed by number or expression
                // We emit FIELD_REF operator-like or simple $?
                // Let's emit '$' as special, or handle '$0' as single token?
                // Awk allows '$i'. So '$' is an operator prefix?
                // Actually, let's treat '$' as an operator in parser logic (unary operator).
                // But for now, let's return a specific token for $.
                // Wait, I defined FIELD_REF. Let's start with simple $ token logic.
                // Actually, let's make it a UNARY op.
                // I will add DOLLAR to enum or reuse FIELD_REF for just '$'.
                // Let's reuse FIELD_REF for '$'.
                tokens.push(this.token(AwkTokenType.FIELD_REF, '$'));
                continue;
            }

            // Operators
            if (char === '+') {
                if (this.peek(1) === '+') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.INC, '++')); continue; }
                if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.PLUS_ASSIGN, '+=')); continue; }
                this.advance(); tokens.push(this.token(AwkTokenType.PLUS, '+')); continue;
            }
            if (char === '-') {
                if (this.peek(1) === '-') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.DEC, '--')); continue; }
                if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.MINUS_ASSIGN, '-=')); continue; }
                this.advance(); tokens.push(this.token(AwkTokenType.MINUS, '-')); continue;
            }
            if (char === '*') {
                if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.STAR_ASSIGN, '*=')); continue; }
                this.advance(); tokens.push(this.token(AwkTokenType.STAR, '*')); continue;
            }
            if (char === '%') {
                if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.PERCENT_ASSIGN, '%=')); continue; }
                this.advance(); tokens.push(this.token(AwkTokenType.PERCENT, '%')); continue;
            }
            if (char === '^') {
                if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.CARET_ASSIGN, '^=')); continue; }
                this.advance(); tokens.push(this.token(AwkTokenType.CARET, '^')); continue;
            }
            if (char === '=') {
                if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.EQ, '==')); continue; }
                this.advance(); tokens.push(this.token(AwkTokenType.ASSIGN, '=')); continue;
            }
            if (char === '!') {
                if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.NEQ, '!=')); continue; }
                if (this.peek(1) === '~') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.NOT_MATCH, '!~')); continue; }
                this.advance(); tokens.push(this.token(AwkTokenType.NOT, '!')); continue;
            }
            if (char === '<') {
                if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.LTE, '<=')); continue; }
                this.advance(); tokens.push(this.token(AwkTokenType.LT, '<')); continue;
            }
            if (char === '>') {
                if (this.peek(1) === '=') { this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.GTE, '>=')); continue; }
                this.advance(); tokens.push(this.token(AwkTokenType.GT, '>')); continue;
            }
            if (char === '&' && this.peek(1) === '&') {
                this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.AND, '&&')); continue;
            }
            if (char === '|' && this.peek(1) === '|') {
                this.advance(); this.advance(); tokens.push(this.token(AwkTokenType.OR, '||')); continue;
            }
            if (char === '~') {
                this.advance(); tokens.push(this.token(AwkTokenType.MATCH, '~')); continue;
            }

            // Punctuation
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

            // Unknown
            throw new Error(`AwkLexer: Unexpected character '${char}' at ${this.line}:${this.col}`);
        }

        tokens.push(this.token(AwkTokenType.EOF, ''));
        return tokens;
    }

    private peek(offset = 0): string {
        return this.source[this.pos + offset] || '';
    }

    private advance(): string {
        const c = this.source[this.pos++];
        this.col++;
        return c;
    }

    private token(type: AwkTokenType, value: string): AwkToken {
        return { type, value, line: this.line, col: this.col - value.length };
    }

    private readString(): AwkToken {
        this.advance(); // "
        let str = '';
        while (this.pos < this.source.length && this.peek() !== '"') {
            if (this.peek() === '\\') {
                this.advance();
                str += this.advance(); // Simple escape
            } else {
                str += this.advance();
            }
        }
        if (this.peek() !== '"') throw new Error("Unterminated string");
        this.advance(); // "
        return this.token(AwkTokenType.STRING, str);
    }

    private readRegex(): AwkToken {
        this.advance(); // /
        let str = '';
        while (this.pos < this.source.length) {
            if (this.peek() === '/' && this.source[this.pos - 1] !== '\\') { // Crude unescaped / check
                break;
            }
            str += this.advance();
        }
        if (this.peek() !== '/') throw new Error("Unterminated regex");
        this.advance();
        return this.token(AwkTokenType.REGEX, str);
    }

    private readNumber(): AwkToken {
        let num = '';
        while (this.pos < this.source.length && /[0-9.]/.test(this.peek())) {
            num += this.advance();
        }
        return this.token(AwkTokenType.NUMBER, num);
    }

    private readIdentifier(): AwkToken {
        let id = '';
        while (this.pos < this.source.length && /[a-zA-Z0-9_]/.test(this.peek())) {
            id += this.advance();
        }

        // Keywords
        switch (id) {
            case 'BEGIN': return this.token(AwkTokenType.BEGIN, id);
            case 'END': return this.token(AwkTokenType.END, id);
            case 'print': return this.token(AwkTokenType.PRINT, id);
            case 'if': return this.token(AwkTokenType.IF, id);
            case 'else': return this.token(AwkTokenType.ELSE, id);
            // ... add others as needed
            case 'length': return this.token(AwkTokenType.IDENTIFIER, id); // Builtin
        }
        return this.token(AwkTokenType.IDENTIFIER, id);
    }
}
