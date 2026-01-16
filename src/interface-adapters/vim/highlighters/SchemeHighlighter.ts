/**
 * SchemeHighlighter - Interface Adapter Layer
 * 
 * Provides syntax highlighting for Scheme (.scm) files.
 * Uses regex-based tokenization for performance and simplicity.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture)
 * Pillar: THE MASTER’S TOOL (Strategy Pattern)
 * 
 * Intent:
 * Improves the development experience in Vim for Scheme scripts.
 * Highlights keywords (define, lambda, if), strings, and comments.
 */

import { SyntaxHighlighter, HighlightToken } from '../../../domain/ports/SyntaxHighlighter';

export class SchemeHighlighter implements SyntaxHighlighter {
    readonly language = 'scheme';

    highlight(line: string): HighlightToken[] {
        const tokens: HighlightToken[] = [];
        let remaining = line;

        // Keywords from R7RS and our core
        const keywords = [
            'define', 'lambda', 'if', 'quote', 'set!', 'begin', 'cond', 'else',
            'let', 'let*', 'letrec', 'and', 'or', 'not', 'cons', 'car', 'cdr',
            'list', 'null?', 'pair?', 'display'
        ];

        while (remaining.length > 0) {
            // Comments
            const commentMatch = remaining.match(/^;.*/);
            if (commentMatch) {
                tokens.push({ text: commentMatch[0], type: 'comment' });
                break;
            }

            // Strings
            const stringMatch = remaining.match(/^".*?"/);
            if (stringMatch) {
                tokens.push({ text: stringMatch[0], type: 'string' });
                remaining = remaining.slice(stringMatch[0].length);
                continue;
            }

            // Numbers
            const numberMatch = remaining.match(/^-?\d+(\.\d+)?/);
            if (numberMatch && !remaining[numberMatch[0].length]?.match(/[a-zA-Z]/)) {
                tokens.push({ text: numberMatch[0], type: 'number' });
                remaining = remaining.slice(numberMatch[0].length);
                continue;
            }

            // Parens (operators/punctuation)
            const parenMatch = remaining.match(/^[()]/);
            if (parenMatch) {
                tokens.push({ text: parenMatch[0], type: 'operator' });
                remaining = remaining.slice(1);
                continue;
            }

            // Keywords vs Identifiers
            const wordMatch = remaining.match(/^[a-zA-Z0-9+\-*/<=>?!]+/);
            if (wordMatch) {
                const word = wordMatch[0];
                if (keywords.includes(word)) {
                    tokens.push({ text: word, type: 'keyword' });
                } else {
                    tokens.push({ text: word, type: 'plain' });
                }
                remaining = remaining.slice(word.length);
                continue;
            }

            // Whitespace
            const wsMatch = remaining.match(/^\s+/);
            if (wsMatch) {
                tokens.push({ text: wsMatch[0], type: 'plain' });
                remaining = remaining.slice(wsMatch[0].length);
                continue;
            }

            // Fallback
            tokens.push({ text: remaining[0], type: 'plain' });
            remaining = remaining.slice(1);
        }

        return tokens;
    }
}
