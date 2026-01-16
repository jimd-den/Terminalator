/**
 * TypescriptHighlighter - Interface Adapter Layer
 *
 * A simple regex-based syntax highlighter for TypeScript.
 *
 * Pillar: The Master’s Tool (Strategy Pattern Implementation)
 * Pillar: Dependency Minimalism (No external libs used)
 */

import { SyntaxHighlighter, HighlightToken } from '../../../domain/ports/SyntaxHighlighter';

export class TypescriptHighlighter implements SyntaxHighlighter {
    readonly language = 'typescript';

    private readonly keywords = new Set([
        'import', 'from', 'export', 'class', 'interface', 'const', 'let', 'var',
        'async', 'await', 'return', 'if', 'else', 'for', 'while', 'switch', 'case',
        'default', 'try', 'catch', 'finally', 'new', 'this', 'private', 'protected',
        'public', 'static', 'readonly', 'type', 'of', 'in', 'extends', 'implements'
    ]);

    highlight(line: string): HighlightToken[] {
        if (!line) return [];

        const tokens: HighlightToken[] = [];
        let current = '';
        let i = 0;

        while (i < line.length) {
            const char = line[i];

            // String Literals
            if (char === '"' || char === "'" || char === '`') {
                const quote = char;
                let str = char;
                i++;
                while (i < line.length && line[i] !== quote) {
                    if (line[i] === '\\' && i + 1 < line.length) {
                        str += line[i] + line[i + 1];
                        i += 2;
                    } else {
                        str += line[i];
                        i++;
                    }
                }
                if (i < line.length) {
                    str += line[i];
                    i++;
                }
                tokens.push({ text: str, type: 'string' });
                continue;
            }

            // Comments
            if (char === '/' && i + 1 < line.length && line[i + 1] === '/') {
                tokens.push({ text: line.slice(i), type: 'comment' });
                break;
            }

            // Identifiers / Keywords / Numbers
            if (/[a-zA-Z0-9_$]/.test(char)) {
                let word = '';
                while (i < line.length && /[a-zA-Z0-9_$]/.test(line[i])) {
                    word += line[i];
                    i++;
                }

                if (this.keywords.has(word)) {
                    tokens.push({ text: word, type: 'keyword' });
                } else if (/^[0-9]+$/.test(word)) {
                    tokens.push({ text: word, type: 'number' });
                } else {
                    tokens.push({ text: word, type: 'plain' });
                }
                continue;
            }

            // Operators / Punctuation
            tokens.push({ text: char, type: 'operator' });
            i++;
        }

        return tokens;
    }
}
