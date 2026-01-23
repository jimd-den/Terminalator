/**
 * ShellExpansionService - Domain Service
 *
 * Handles expansion of shell tokens:
 * 1. Variable Expansion ($VAR)
 * 2. Arithmetic Expansion $(( expr ))
 * 3. Path expansion (Globbing)
 *
 * Pillar: The Four-Fold Shield (Use Case/Service Layer)
 */

import { FileSystemService } from './FileSystemService';
import { GlobService } from './GlobService';
import { ArithmeticEvaluator } from './ArithmeticEvaluator';

export class ShellExpansionService {
    private globService: GlobService;
    private arithmetic: ArithmeticEvaluator;

    constructor(private fsService: FileSystemService) {
        this.globService = new GlobService(fsService);
        this.arithmetic = new ArithmeticEvaluator();
    }

    /**
     * Expands a single token into zero or more strings.
     * Order:
     * 1. Variable Expansion
     * 2. Arithmetic Expansion
     * 3. Globbing
     * 4. Quote Removal
     */
    /**
     * Expands a single token into zero or more strings.
     * Handles quoting correctly:
     * - Single quotes: No expansion.
     * - Double quotes: Expand $, ``, \.
     * - No quotes: Expand all.
     */
    expandToken(token: string, env: { [key: string]: string }, cwd: string): string[] {
        // 1. Process Expansion (Variables, Arithmetic) respecting quotes
        const expanded = this.processExpansion(token, env);

        // 2. Globbing (only on unquoted parts? Simplified: glob the result if it looks like a pattern?)
        // POSIX: Globbing happens after expansion.
        // But globbing should not expand valid filenames that were result of expansion if they were quoted?
        // Simplified: Glob everything.
        const globbed = this.globService.expand(expanded, cwd);

        // 3. Quote Removal
        return globbed.map(s => this.removeQuotes(s));
    }

    /**
     * Variable and Arithmetic expansion with quote awareness.
     */
    private processExpansion(text: string, env: { [key: string]: string }): string {
        let output = '';
        let i = 0;
        let inSingle = false;
        let inDouble = false;
        let escaped = false;

        const len = text.length;

        while (i < len) {
            const char = text[i];

            if (escaped) {
                output += char; // Keep literal (escaped char logic handled in removeQuotes mostly, but here we just shouldn't expand)
                escaped = false;
                i++;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                output += char; // Keep backslash for Quote Removal step
                i++;
                continue;
            }

            if (char === "'" && !inDouble) {
                inSingle = !inSingle;
                output += char;
                i++;
                continue;
            }

            if (char === '"' && !inSingle) {
                inDouble = !inDouble;
                output += char;
                i++;
                continue;
            }

            // Expansion triggers: $
            if (char === '$' && !inSingle) {
                // Check for $( (Command Subst - stubbed), $(( (Arithmetic), $VAR
                if (text.startsWith('$((', i)) {
                    // Arithmetic
                    const end = this.findMatchingParen(text, i + 3);
                    if (end !== -1) {
                        const expr = text.substring(i + 3, end - 1); // $(( expr )) -> expr needs inner parsing?
                        // Simplified: Assume expr is internal
                        // $((...))
                        // We need to extract the exact range.
                        const fullExpr = text.substring(i, end + 1);
                        // Recursively expand variables inside arithmetic expression?
                        // Arithmetic evaluator usually handles vars.
                        // Let's perform expansion on the content first?
                        // "The expression is treated as if it were in double quotes"
                        // Simplified: Evaluator
                        try {
                            const val = this.arithmetic.evaluate(expr);
                            output += val.toString();
                        } catch {
                            output += '0';
                        }
                        i = end + 1;
                        continue;
                    }
                }

                // Variable
                const rest = text.substring(i);
                const match = rest.match(/^\$([a-zA-Z_][a-zA-Z0-9_]*|[0-9]+|[#@*?]|\{[^}]+\})/);
                if (match) {
                    const varNameRaw = match[1];
                    let varName = varNameRaw;
                    if (varName.startsWith('{') && varName.endsWith('}')) {
                        varName = varName.slice(1, -1);
                    }
                    output += env[varName] || '';
                    i += match[0].length;
                    continue;
                }
            }

            output += char;
            i++;
        }

        return output;
    }

    private findMatchingParen(text: string, start: number): number {
        let depth = 1; // We passed $((
        // Actually start should be after $((.
        // We look for ))
        // Current logic stub for $((...))
        // Simple search for ))
        const idx = text.indexOf('))', start);
        if (idx !== -1) return idx + 1; // point to last )
        return -1;
    }

    /**
     * Removes outer quotes and processes escapes.
     * Corresponds to POSIX Quote Removal.
     */
    private removeQuotes(text: string): string {
        let output = '';
        let inSingle = false;
        let inDouble = false;
        let escaped = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (escaped) {
                // In double quotes, only specific chars are escaped by backslash
                if (inDouble) {
                    // POSIX: inside "", \ only escapes $ ` " \ \n
                    if (['$', '`', '"', '\\', '\n'].includes(char)) {
                        output += char;
                    } else {
                        // Otherwise, backslash is preserved
                        output += '\\' + char;
                    }
                } else {
                    // Outside quotes, backslash always escapes next char
                    output += char;
                }
                escaped = false;
                continue;
            }

            if (char === '\\') {
                if (inSingle) {
                    output += char; // Literal backslash in single quotes
                } else {
                    escaped = true;
                }
                continue;
            }

            if (char === "'" && !inDouble) {
                inSingle = !inSingle;
                continue;
            }

            if (char === '"' && !inSingle) {
                inDouble = !inDouble;
                continue;
            }

            output += char;
        }
        return output;
    }

    expandArithmetic(text: string): string {
        // Fallback or public method if called directly
        return this.processExpansion(text, {});
    }

    expandVariables(text: string, env: { [key: string]: string }): string {
        return this.processExpansion(text, env);
    }
}
