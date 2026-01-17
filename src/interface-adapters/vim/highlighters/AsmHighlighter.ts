/**
 * AsmHighlighter - Interface Adapter Layer
 * 
 * Provides syntax highlighting for RISC-V Assembly (.s) files.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture) - Adapters
 * Pillar: THE MASTER’S TOOL (Strategy Pattern)
 */

import { SyntaxHighlighter, HighlightToken } from '../../../domain/ports/SyntaxHighlighter';

export class AsmHighlighter implements SyntaxHighlighter {
    readonly language = 'asm';

    highlight(line: string): HighlightToken[] {
        const tokens: HighlightToken[] = [];
        let remaining = line;

        // Keywords (Mnemonics & Pseudo-ops)
        const keywords = [
            'add', 'sub', 'addi', 'lw', 'sw', 'beq', 'bne', 'jal', 'jalr',
            'li', 'mv', 'nop', 'ecall', 'la', 'lui', 'auipc'
        ];

        // Registers
        const registers = [
            'zero', 'ra', 'sp', 'gp', 'tp', 't0', 't1', 't2',
            's0', 'fp', 's1', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5',
            'a6', 'a7', 's2', 's3', 's4', 's5', 's6', 's7',
            's8', 's9', 's10', 's11', 't3', 't4', 't5', 't6'
        ];

        while (remaining.length > 0) {
            // Comments
            const commentMatch = remaining.match(/^;.*/);
            if (commentMatch) {
                tokens.push({ text: commentMatch[0], type: 'comment' });
                break;
            }

            // Labels
            const labelMatch = remaining.match(/^[a-zA-Z_][a-zA-Z0-9_]*:/);
            if (labelMatch) {
                tokens.push({ text: labelMatch[0], type: 'keyword' }); // Labels look like keywords
                remaining = remaining.slice(labelMatch[0].length);
                continue;
            }

            // Strings (if any)
            const stringMatch = remaining.match(/^".*?"/);
            if (stringMatch) {
                tokens.push({ text: stringMatch[0], type: 'string' });
                remaining = remaining.slice(stringMatch[0].length);
                continue;
            }

            // Words (Registers or Keywords)
            const wordMatch = remaining.match(/^[a-zA-Z0-9_]+/);
            if (wordMatch) {
                const word = wordMatch[0];
                if (keywords.includes(word.toLowerCase())) {
                    tokens.push({ text: word, type: 'keyword' });
                } else if (registers.includes(word.toLowerCase())) {
                    tokens.push({ text: word, type: 'number' }); // Colors registers like numbers
                } else {
                    tokens.push({ text: word, type: 'plain' });
                }
                remaining = remaining.slice(word.length);
                continue;
            }

            // Numbers
            const numberMatch = remaining.match(/^-?\d+/);
            if (numberMatch) {
                tokens.push({ text: numberMatch[0], type: 'number' });
                remaining = remaining.slice(numberMatch[0].length);
                continue;
            }

            // Punctuation
            const punctMatch = remaining.match(/^[,()]/);
            if (punctMatch) {
                tokens.push({ text: punctMatch[0], type: 'operator' });
                remaining = remaining.slice(1);
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
