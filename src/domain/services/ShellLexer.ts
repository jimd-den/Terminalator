/**
 * ShellLexer - Domain Layer
 * 
 * Tokenizes raw shell input into a stream of typed tokens.
 * Handles quoting, operators, and comments according to POSIX.
 *
 * Pillar: The Four-Fold Shield (Strict Services)
 * Pillar: Performance & Purity (O(n) State Machine)
 */

export enum TokenType {
    WORD = 'WORD',
    PIPE = 'PIPE',       // |
    SEMI = 'SEMI',       // ;
    AND_IF = 'AND_IF',   // &&
    OR_IF = 'OR_IF',     // ||
    LPAREN = 'LPAREN',   // (
    RPAREN = 'RPAREN',   // )
    NEWLINE = 'NEWLINE', // \n
    EOF = 'EOF'
}

export interface Token {
    type: TokenType;
    value: string;
    position: number;
}

export class ShellLexer {
    private input: string = '';
    private pos: number = 0;
    private len: number = 0;

    tokenize(input: string): Token[] {
        this.input = input;
        this.pos = 0;
        this.len = input.length;
        const tokens: Token[] = [];

        while (this.pos < this.len) {
            this.skipWhitespace();
            if (this.pos >= this.len) break;

            const char = this.peek();

            // Comments
            if (char === '#') {
                this.skipComment();
                continue;
            }

            // Operators
            if (this.isOperatorStart(char)) {
                const opToken = this.readOperator();
                if (opToken) {
                    tokens.push(opToken);
                    continue;
                }
            }

            // Newline
            if (char === '\n') {
                tokens.push({ type: TokenType.NEWLINE, value: '\n', position: this.pos++ });
                continue;
            }

            // Words (includes quotes)
            const word = this.readWord();
            if (word) {
                tokens.push(word);
            } else {
                // Safety break if stuck
                this.pos++;
            }
        }

        tokens.push({ type: TokenType.EOF, value: '', position: this.pos });
        return tokens;
    }

    private peek(offset: number = 0): string {
        return this.input[this.pos + offset] || '';
    }

    private skipWhitespace() {
        while (this.pos < this.len) {
            const char = this.input[this.pos];
            if (char === ' ' || char === '\t') {
                this.pos++;
            } else {
                break;
            }
        }
    }

    private skipComment() {
        while (this.pos < this.len) {
            if (this.input[this.pos] === '\n') break;
            this.pos++;
        }
    }

    private isOperatorStart(char: string): boolean {
        return /[|;&()]/.test(char);
    }

    private readOperator(): Token | null {
        const c1 = this.peek(0);
        const c2 = this.peek(1);
        const start = this.pos;

        // Two-char operators: &&, ||
        if ((c1 === '&' && c2 === '&') || (c1 === '|' && c2 === '|')) {
            this.pos += 2;
            return {
                type: c1 === '&' ? TokenType.AND_IF : TokenType.OR_IF,
                value: c1 + c2,
                position: start
            };
        }

        // Single-char operators
        if (c1 === '|') {
            this.pos++;
            return { type: TokenType.PIPE, value: '|', position: start };
        }
        if (c1 === ';') {
            this.pos++;
            return { type: TokenType.SEMI, value: ';', position: start };
        }
        if (c1 === '(') {
            this.pos++;
            return { type: TokenType.LPAREN, value: '(', position: start };
        }
        if (c1 === ')') {
            this.pos++;
            return { type: TokenType.RPAREN, value: ')', position: start };
        }

        return null; // Not an operator
    }

    private readWord(): Token | null {
        let value = '';
        const start = this.pos;
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let escaped = false;

        while (this.pos < this.len) {
            const char = this.input[this.pos];

            if (escaped) {
                value += char;
                escaped = false;
                this.pos++;
                continue;
            }

            if (char === '\\') {
                // Backslash logic
                if (inSingleQuote) {
                    value += char; // Literal backslash in single quotes
                } else {
                    escaped = true; // Next literal
                }
                this.pos++;
                continue;
            }

            if (char === "'" && !inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
                // We do NOT include the quote chars in the value (Quote Removal step done here for simplicity, 
                // though strictly POSIX does it later. For now, doing it here simplifies AST).
                // Actually, let's include valid content.
                this.pos++;
                continue;
            }

            if (char === '"' && !inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
                this.pos++;
                continue;
            }

            // Word Delimiters (if not quoted)
            if (!inSingleQuote && !inDoubleQuote) {
                if (char === ' ' || char === '\t' || char === '\n') break;
                if (this.isOperatorStart(char)) break;
                // POSIX: # starts comment only where a token begins, i.e., after whitespace/separator.
                // Since readWord is called when NOT at whitespace/comment/operator,
                // a # here is part of the word (e.g. arg#val).
            }

            value += char;
            this.pos++;
        }

        if (value.length === 0 && this.pos === start) return null;

        // Check for unclosed quotes?
        if (inSingleQuote || inDoubleQuote) {
            throw new Error("Syntax Error: Unclosed quote");
        }

        return {
            type: TokenType.WORD,
            value: value,
            position: start
        };
    }
}
