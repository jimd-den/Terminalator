/**
 * ShellLexer - Domain Layer
 *
 * Token recognition per POSIX XCU §2.3. Produces operators, IO_NUMBERs,
 * NEWLINEs and WORDs. Words keep their quoting characters verbatim so that
 * the expansion phase can apply the quoting rules; nested `$( )`, `$(( ))`,
 * `${ }` and backquotes are consumed as part of the enclosing word.
 *
 * Here-documents: after a NEWLINE, the bodies of all pending `<<`/`<<-`
 * redirections are read and attached to their delimiter tokens.
 */

import { IncompleteInputError } from './shell/ShellSyntaxError';
import { SourceScanner } from './shell/SourceScanner';

export enum TokenType {
    WORD = 'WORD',
    IO_NUMBER = 'IO_NUMBER',
    PIPE = 'PIPE',           // |
    SEMI = 'SEMI',           // ;
    AMP = 'AMP',             // &
    AND_IF = 'AND_IF',       // &&
    OR_IF = 'OR_IF',         // ||
    DSEMI = 'DSEMI',         // ;;
    LPAREN = 'LPAREN',       // (
    RPAREN = 'RPAREN',       // )
    LESS = 'LESS',           // <
    GREAT = 'GREAT',         // >
    DLESS = 'DLESS',         // <<
    DGREAT = 'DGREAT',       // >>
    LESSAND = 'LESSAND',     // <&
    GREATAND = 'GREATAND',   // >&
    LESSGREAT = 'LESSGREAT', // <>
    DLESSDASH = 'DLESSDASH', // <<-
    CLOBBER = 'CLOBBER',     // >|
    NEWLINE = 'NEWLINE',
    EOF = 'EOF'
}

export interface Token {
    type: TokenType;
    value: string;
    position: number;
    /** True if the word contains any quoting (', ", \). */
    quoted?: boolean;
    /** Filled in on here-doc delimiter words once the body has been read. */
    heredoc?: { body: string; quoted: boolean };
}

/** Operators, longest first so that greedy matching works. */
const OPERATORS: [string, TokenType][] = [
    ['<<-', TokenType.DLESSDASH],
    ['&&', TokenType.AND_IF],
    ['||', TokenType.OR_IF],
    [';;', TokenType.DSEMI],
    ['<<', TokenType.DLESS],
    ['>>', TokenType.DGREAT],
    ['<&', TokenType.LESSAND],
    ['>&', TokenType.GREATAND],
    ['<>', TokenType.LESSGREAT],
    ['>|', TokenType.CLOBBER],
    ['|', TokenType.PIPE],
    [';', TokenType.SEMI],
    ['&', TokenType.AMP],
    ['(', TokenType.LPAREN],
    [')', TokenType.RPAREN],
    ['<', TokenType.LESS],
    ['>', TokenType.GREAT],
];

export const REDIRECT_TOKENS = new Set<TokenType>([
    TokenType.LESS, TokenType.GREAT, TokenType.DLESS, TokenType.DGREAT,
    TokenType.LESSAND, TokenType.GREATAND, TokenType.LESSGREAT,
    TokenType.DLESSDASH, TokenType.CLOBBER
]);

interface PendingHereDoc {
    token: Token;
    stripTabs: boolean;
}

export class ShellLexer extends SourceScanner {

    tokenize(input: string): Token[] {
        this.input = input;
        this.pos = 0;
        const tokens: Token[] = [];
        const pending: PendingHereDoc[] = [];
        let expectHereDelimiter: boolean | null = null; // stripTabs flag when set

        while (true) {
            this.skipBlanks();
            if (this.pos >= this.input.length) break;
            const c = this.input[this.pos];

            if (c === '#') {
                while (this.pos < this.input.length && this.input[this.pos] !== '\n') this.pos++;
                continue;
            }

            if (c === '\n') {
                tokens.push({ type: TokenType.NEWLINE, value: '\n', position: this.pos++ });
                if (pending.length > 0) {
                    for (const doc of pending) this.readHereDocBody(doc);
                    pending.length = 0;
                }
                continue;
            }

            const op = this.matchOperator();
            if (op) {
                tokens.push(op);
                if (op.type === TokenType.DLESS || op.type === TokenType.DLESSDASH) {
                    expectHereDelimiter = op.type === TokenType.DLESSDASH;
                }
                continue;
            }

            const word = this.readWord();
            if (/^[0-9]+$/.test(word.value) && !word.quoted && (this.peekChar() === '<' || this.peekChar() === '>')) {
                word.type = TokenType.IO_NUMBER;
            }
            tokens.push(word);

            if (expectHereDelimiter !== null && word.type === TokenType.WORD) {
                pending.push({ token: word, stripTabs: expectHereDelimiter });
                expectHereDelimiter = null;
            }
        }

        if (pending.length > 0) {
            // Bodies that begin on the same line as EOF: read what is left (none).
            throw new IncompleteInputError('here-document delimited by end-of-file');
        }

        tokens.push({ type: TokenType.EOF, value: '', position: this.pos });
        return tokens;
    }

    private peekChar(offset = 0): string {
        return this.input[this.pos + offset] || '';
    }

    private skipBlanks() {
        while (this.pos < this.input.length) {
            const c = this.input[this.pos];
            if (c === ' ' || c === '\t') {
                this.pos++;
            } else if (c === '\\' && this.input[this.pos + 1] === '\n') {
                this.pos += 2; // line continuation
            } else {
                break;
            }
        }
    }

    private matchOperator(): Token | null {
        for (const [text, type] of OPERATORS) {
            if (this.input.startsWith(text, this.pos)) {
                const token = { type, value: text, position: this.pos };
                this.pos += text.length;
                return token;
            }
        }
        return null;
    }

    private isWordBreak(c: string): boolean {
        return c === ' ' || c === '\t' || c === '\n' || c === ';' || c === '&' ||
            c === '|' || c === '(' || c === ')' || c === '<' || c === '>';
    }

    private readWord(): Token {
        const start = this.pos;
        let value = '';
        let quoted = false;

        while (this.pos < this.input.length) {
            const c = this.input[this.pos];

            if (c === '\\') {
                if (this.input[this.pos + 1] === '\n') { this.pos += 2; continue; }
                if (this.pos + 1 >= this.input.length) { value += c; this.pos++; continue; }
                value += c + this.input[this.pos + 1];
                this.pos += 2;
                quoted = true;
                continue;
            }
            if (c === "'") {
                const end = this.input.indexOf("'", this.pos + 1);
                if (end === -1) throw new IncompleteInputError('unterminated quoted string');
                value += this.input.substring(this.pos, end + 1);
                this.pos = end + 1;
                quoted = true;
                continue;
            }
            if (c === '"') {
                value += this.readDoubleQuoted();
                quoted = true;
                continue;
            }
            if (c === '`') {
                value += this.readBackquoted();
                continue;
            }
            if (c === '$') {
                value += this.readDollar();
                continue;
            }
            if (this.isWordBreak(c)) break;
            value += c;
            this.pos++;
        }

        return { type: TokenType.WORD, value, position: start, quoted };
    }

    private readHereDocBody(doc: PendingHereDoc) {
        const raw = doc.token.value;
        const quoted = /['"\\]/.test(raw);
        const delimiter = raw.replace(/\\(.)/g, '$1').replace(/['"]/g, '');
        const lines: string[] = [];

        while (true) {
            if (this.pos >= this.input.length) {
                throw new IncompleteInputError(`here-document delimited by end-of-file (wanted '${delimiter}')`);
            }
            let end = this.input.indexOf('\n', this.pos);
            const atEof = end === -1;
            if (atEof) end = this.input.length;
            let line = this.input.substring(this.pos, end);
            this.pos = atEof ? end : end + 1;

            if (doc.stripTabs) line = line.replace(/^\t+/, '');
            if (line === delimiter) break;
            lines.push(line);
            if (atEof) throw new IncompleteInputError(`here-document delimited by end-of-file (wanted '${delimiter}')`);
        }

        let body = lines.length ? lines.join('\n') + '\n' : '';
        if (!quoted) body = body.replace(/\\\n/g, '');
        doc.token.heredoc = { body, quoted };
    }
}
