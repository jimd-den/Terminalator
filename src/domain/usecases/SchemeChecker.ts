/**
 * SchemeChecker - Use Case Layer
 * 
 * Implements syntax checking for Scheme source code.
 * Uses the SchemeParser to identify structural errors.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture) - Use Cases
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * Pillar: THE BALANCED SCALE (SOLID)
 * 
 * Intent:
 * Provides immediate feedback on S-expression validity.
 * Validates balanced parentheses and proper quote usage.
 */

import { SyntaxChecker, SyntaxError } from '../ports/SyntaxChecker';
import { SchemeParser } from './SchemeParser';

export class SchemeChecker implements SyntaxChecker {
    readonly language = 'scheme';
    private parser = new SchemeParser();

    check(source: string): SyntaxError[] {
        const errors: SyntaxError[] = [];

        // 1. Check for basic balanced parentheses first for quick feedback
        const parenStats = this.checkParens(source);
        if (parenStats.error) {
            errors.push(parenStats.error);
            // If parens are totally broken, don't overwhelm with parse errors yet
            return errors;
        }

        // 2. Run the full parser to find structural errors (dotted pairs, etc.)
        try {
            this.parser.parse(source);
        } catch (err: any) {
            const message = err.message;
            // Extract location if present: "Unexpected ) at line 5, column 10"
            const match = message.match(/line (\d+), column (\d+)/);

            if (match) {
                errors.push({
                    line: parseInt(match[1]),
                    column: parseInt(match[2]),
                    message: message,
                    severity: 'error'
                });
            } else {
                // Heuristic: if no location, check the end of the file
                const lines = source.split('\n');
                errors.push({
                    line: lines.length,
                    column: lines[lines.length - 1].length + 1,
                    message: message,
                    severity: 'error'
                });
            }
        }

        return errors;
    }

    private checkParens(source: string): { error: SyntaxError | null } {
        const stack: { char: string, line: number, col: number }[] = [];
        let line = 1;
        let col = 1;

        for (let i = 0; i < source.length; i++) {
            const char = source[i];

            if (char === '\n') {
                line++;
                col = 1;
                continue;
            }

            if (char === '(') {
                stack.push({ char: '(', line, col });
            } else if (char === ')') {
                if (stack.length === 0) {
                    return {
                        error: {
                            line,
                            column: col,
                            message: 'Unexpected closing parenthesis ")"',
                            severity: 'error'
                        }
                    };
                }
                stack.pop();
            }
            col++;
        }

        if (stack.length > 0) {
            const last = stack.pop()!;
            return {
                error: {
                    line: last.line,
                    column: last.col,
                    message: 'Unclosed parenthesis "("',
                    severity: 'error'
                }
            };
        }

        return { error: null };
    }
}
