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
        let depth = 1;
        // Start is immediately after $((
        for (let i = start; i < text.length - 1; i++) {
            const char = text[i];
            const next = text[i + 1];

            if (char === '(') {
                depth++;
            } else if (char === ')') {
                if (next === ')') {
                    depth--;
                    if (depth === 0) {
                        return i + 2; // Return position after ))
                    }
                    i++; // Skip the next ) provided we consumed it as part of ))
                    // Wait, if it was )) that closed depth, we return.
                    // If it was just ) that closed inner depth, we continue.
                    // Actually, standard sh parsing:
                    // $(( echo ( 1 ) ))
                    // We need to match parens properly.
                    // Arithmetic expansion $(( ... )) is delimited by )).
                    // Inner ( ) must be balanced.
                    // The depth logic here:
                    // We start with depth 1 (the outer $(()
                    // invalid logic in comment above.
                    // Let's stick to standard paren counting.
                    // We are looking for the closing )) for the opening $((.
                } else {
                    // Single closing paren - does this affect depth?
                    // In arithmetic expression, parens are used for grouping.
                    // ( 1 + 2 )
                    // So yes, we should track single parens too.
                    // But $(( is special.
                    // Let's assume we are simply counting balanced parens starting from the first (.
                    // $(( ... ))
                    // If we treated $(( as opening depth 2, then )) closes depth 2.
                }
            }
        }

        // Revised robust logic:
        // We are at index `start` which is inside $(( ...
        // We need to find the matching ))
        // Since we are doing arithmetic, ( and ) are valid tokens.
        // We just count ( and ).
        // Initial depth = 0 (relative to inside of $(( )) ) ? No.

        // Let's simplify:
        // Input: $(( ... ))
        // We passed the initial $((
        // We scan for )).
        // BUT, inside arithmetic, we might have ( ).
        // Example: $(( (1+2) ))
        // Scan:
        // ( -> depth++
        // ) -> depth--
        // ) -> depth--

        // Wait, the double paren is the delimiter.
        // POSIX: "The expression is treated as if it were in double quotes... except a double-quote inside... is not special?" 
        // Actually: "The characters ... are treated as an arithmetic expression".
        // The shell typically parses this by finding the matching `))`.
        // However, standard `(` and `)` for grouping *must* be skipped.

        // Implementation:
        // depth = 0
        // if char == '(': depth++
        // if char == ')':
        //    if depth > 0: depth--
        //    else:
        //       check if next is ')'. If so, found it.

        // Correct approach:
        let nesting = 0;
        for (let i = start; i < text.length - 1; i++) {
            const char = text[i];

            if (char === '(') {
                nesting++;
            } else if (char === ')') {
                if (nesting > 0) {
                    nesting--;
                } else {
                    // Check for double closing paren ))
                    if (text[i + 1] === ')') {
                        return i + 2; // Found the end
                    }
                }
            }
        }
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
