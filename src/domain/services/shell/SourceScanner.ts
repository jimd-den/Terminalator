import { IncompleteInputError } from './ShellSyntaxError';

/**
 * SourceScanner - shared quote/substitution scanning rules.
 *
 * Both the lexer (to delimit words) and the word expander (to find the end
 * of a quoted section or a nested substitution inside a raw word) need the
 * same rules; they live here once. Each `read*` method starts at `pos` on
 * the opening character and leaves `pos` just past the construct.
 */
export class SourceScanner {
    constructor(protected input = '', public pos = 0) { }

    /** Returns the index just past the construct that starts at `at`. */
    static endOf(text: string, at: number, kind: 'dq' | 'bq' | 'dollar'): number {
        const scanner = new SourceScanner(text, at);
        if (kind === 'dq') scanner.readDoubleQuoted();
        else if (kind === 'bq') scanner.readBackquoted();
        else scanner.readDollar();
        return scanner.pos;
    }

    public readDoubleQuoted(): string {
        let out = '"';
        this.pos++;
        while (this.pos < this.input.length) {
            const c = this.input[this.pos];
            if (c === '"') { this.pos++; return out + '"'; }
            if (c === '\\') {
                const next = this.input[this.pos + 1];
                if (next === '\n') { this.pos += 2; continue; }
                out += c + (next ?? '');
                this.pos += 2;
                continue;
            }
            if (c === '`') { out += this.readBackquoted(); continue; }
            if (c === '$') { out += this.readDollar(); continue; }
            out += c;
            this.pos++;
        }
        throw new IncompleteInputError('unterminated quoted string');
    }

    public readBackquoted(): string {
        let out = '`';
        this.pos++;
        while (this.pos < this.input.length) {
            const c = this.input[this.pos];
            if (c === '\\') {
                out += c + (this.input[this.pos + 1] ?? '');
                this.pos += 2;
                continue;
            }
            out += c;
            this.pos++;
            if (c === '`') return out;
        }
        throw new IncompleteInputError('unterminated backquote');
    }

    /** Reads `$...` constructs: `$((..))`, `$(..)`, `${..}` or a plain `$`. */
    public readDollar(): string {
        const next = this.input[this.pos + 1];
        if (next === '(') {
            if (this.input[this.pos + 2] === '(') {
                const arith = this.tryReadArithmetic();
                if (arith !== null) return arith;
            }
            const start = this.pos;
            this.pos += 2;
            this.skipBalanced(')');
            return this.input.substring(start, this.pos);
        }
        if (next === '{') {
            const start = this.pos;
            this.pos += 2;
            this.skipBalanced('}');
            return this.input.substring(start, this.pos);
        }
        this.pos++;
        return '$';
    }

    /** `$((` ... `))` with balanced inner parentheses; null if it is really `$( (subshell) )`. */
    public tryReadArithmetic(): string | null {
        const start = this.pos;
        let i = this.pos + 3;
        let depth = 0;
        while (i < this.input.length) {
            const c = this.input[i];
            if (c === '(') depth++;
            else if (c === ')') {
                if (depth === 0) {
                    if (this.input[i + 1] === ')') {
                        this.pos = i + 2;
                        return this.input.substring(start, this.pos);
                    }
                    return null;
                }
                depth--;
            }
            i++;
        }
        throw new IncompleteInputError('unterminated arithmetic expansion');
    }

    /**
     * Advances past the matching `close` character, honouring quotes and
     * nested substitutions. Used for `$(...)` and `${...}`.
     */
    public skipBalanced(close: ')' | '}') {
        let depth = 0;
        // `case` patterns end in an unbalanced ')' inside $( ... ).
        let caseDepth = 0;
        while (this.pos < this.input.length) {
            const c = this.input[this.pos];
            if (close === ')' && this.isCommentStart()) {
                if (this.atKeyword('case')) { caseDepth++; this.pos += 4; continue; }
                if (this.atKeyword('esac')) { caseDepth = Math.max(0, caseDepth - 1); this.pos += 4; continue; }
            }
            if (c === ')' && depth === 0 && caseDepth > 0) { this.pos++; continue; }
            if (c === '\\') { this.pos += 2; continue; }
            if (c === "'") {
                if (close === '}') { this.pos++; continue; }
                const end = this.input.indexOf("'", this.pos + 1);
                if (end === -1) throw new IncompleteInputError('unterminated quoted string');
                this.pos = end + 1;
                continue;
            }
            if (c === '"') { this.readDoubleQuoted(); continue; }
            if (c === '`') { this.readBackquoted(); continue; }
            if (c === '$') { this.readDollar(); continue; }
            if (close === ')' && c === '#' && this.isCommentStart()) {
                while (this.pos < this.input.length && this.input[this.pos] !== '\n') this.pos++;
                continue;
            }
            if (c === (close === ')' ? '(' : '{')) depth++;
            if (c === close) {
                if (depth === 0) { this.pos++; return; }
                depth--;
            }
            this.pos++;
        }
        throw new IncompleteInputError(`missing '${close}'`);
    }

    /** True if `word` starts at pos and ends at a word boundary. */
    private atKeyword(word: string): boolean {
        if (!this.input.startsWith(word, this.pos)) return false;
        const after = this.input[this.pos + word.length];
        return after === undefined || /[\s;&|()]/.test(after);
    }

    public isCommentStart(): boolean {
        const prev = this.input[this.pos - 1];
        return prev === undefined || prev === ' ' || prev === '\t' || prev === '\n' || prev === '(' || prev === ';';
    }
}
