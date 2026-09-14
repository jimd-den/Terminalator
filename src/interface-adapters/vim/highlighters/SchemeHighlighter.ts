/**
 * SchemeHighlighter - Interface Adapter Layer
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * Structure As Syntax
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * In most languages highlighting picks out keywords. In Scheme the keywords
 * barely matter -- the program IS its nesting, and the single hardest part of
 * reading it is working out which paren closes which.
 *
 * So parens carry a depth, which the renderer colours in a repeating cycle.
 * The structure then reads at a glance instead of being counted, which is the
 * difference between Lisp looking like soup and looking like shape.
 *
 * NOTE ON STATE: depth carries across lines, so this highlighter assumes lines
 * are highlighted top to bottom (which is how the editor renders). Call
 * reset() before re-highlighting a buffer from the start.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { SyntaxHighlighter, HighlightToken } from '../../../domain/ports/SyntaxHighlighter';

/** Special forms -- the ones that do not evaluate their arguments normally. */
const SPECIAL_FORMS = new Set([
    'define', 'lambda', 'if', 'quote', 'quasiquote', 'unquote', 'unquote-splicing',
    'set!', 'begin', 'cond', 'case', 'else', '=>', 'and', 'or', 'when', 'unless',
    'let', 'let*', 'letrec', 'letrec*', 'let-values', 'let*-values', 'define-values',
    'do', 'delay', 'delay-force', 'make-promise', 'parameterize', 'guard',
    'define-syntax', 'let-syntax', 'letrec-syntax', 'syntax-rules',
    'call/cc', 'call-with-current-continuation', 'define-record-type'
]);

export class SchemeHighlighter implements SyntaxHighlighter {
    readonly language = 'scheme';

    /** Paren nesting carried between lines. */
    private depth = 0;

    /** Call before highlighting a buffer from its first line. */
    public reset(): void {
        this.depth = 0;
    }

    highlight(line: string): HighlightToken[] {
        const tokens: HighlightToken[] = [];
        let rest = line;
        // The symbol right after an open paren is the operator being applied,
        // which is worth distinguishing from its arguments.
        let expectHead = false;

        while (rest.length > 0) {
            // Comments run to end of line.
            const comment = rest.match(/^;.*/);
            if (comment) { tokens.push({ text: comment[0], type: 'comment' }); break; }

            // Block comments and datum comments are common in real Scheme.
            if (rest.startsWith('#|')) {
                const end = rest.indexOf('|#');
                const text = end >= 0 ? rest.slice(0, end + 2) : rest;
                tokens.push({ text, type: 'comment' });
                rest = rest.slice(text.length);
                continue;
            }

            const str = rest.match(/^"(?:[^"\\]|\\.)*"?/);
            if (str) {
                tokens.push({ text: str[0], type: 'string' });
                rest = rest.slice(str[0].length);
                continue;
            }

            // Character literals: #\a, #\space, #\newline
            const char = rest.match(/^#\\(?:[a-zA-Z]+|.)/);
            if (char) {
                tokens.push({ text: char[0], type: 'string' });
                rest = rest.slice(char[0].length);
                continue;
            }

            const bool = rest.match(/^#(?:t|f|true|false)\b/);
            if (bool) {
                tokens.push({ text: bool[0], type: 'keyword' });
                rest = rest.slice(bool[0].length);
                continue;
            }

            // Open: this paren belongs to the depth it creates.
            if (rest[0] === '(' || rest[0] === '[') {
                tokens.push({ text: rest[0], type: 'operator', depth: this.depth });
                this.depth++;
                expectHead = true;
                rest = rest.slice(1);
                continue;
            }

            // Close: pair it with the same depth as its opener.
            if (rest[0] === ')' || rest[0] === ']') {
                this.depth = Math.max(0, this.depth - 1);
                tokens.push({ text: rest[0], type: 'operator', depth: this.depth });
                expectHead = false;
                rest = rest.slice(1);
                continue;
            }

            // Reader shorthand.
            const quote = rest.match(/^(?:'|`|,@|,|#\()/);
            if (quote) {
                tokens.push({ text: quote[0], type: 'keyword' });
                if (quote[0] === '#(') this.depth++;
                rest = rest.slice(quote[0].length);
                continue;
            }

            // Numbers, including the rationals the reader now accepts.
            const number = rest.match(/^[+-]?(?:\d+\/\d+|\d*\.\d+|\d+\.?)(?![a-zA-Z!?*/<>=+-])/);
            if (number && number[0] !== '+' && number[0] !== '-') {
                tokens.push({ text: number[0], type: 'number' });
                rest = rest.slice(number[0].length);
                expectHead = false;
                continue;
            }

            const word = rest.match(/^[^\s()\[\];"']+/);
            if (word) {
                const w = word[0];
                tokens.push({
                    text: w,
                    type: SPECIAL_FORMS.has(w.toLowerCase()) ? 'keyword'
                        : expectHead ? 'function'
                        : 'plain'
                });
                expectHead = false;
                rest = rest.slice(w.length);
                continue;
            }

            const ws = rest.match(/^\s+/);
            if (ws) {
                tokens.push({ text: ws[0], type: 'plain' });
                rest = rest.slice(ws[0].length);
                continue;
            }

            tokens.push({ text: rest[0], type: 'plain' });
            rest = rest.slice(1);
        }

        return tokens;
    }
}
