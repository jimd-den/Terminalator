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
    expandToken(token: string, env: { [key: string]: string }, cwd: string): string[] {
        let current = this.expandVariables(token, env);
        current = this.expandArithmetic(current);

        // Globbing returns multiple strings
        const globbed = this.globService.expand(current, cwd);

        // Quote Removal on each resulting word
        return globbed.map(s => this.removeQuotes(s));
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
                        // Otherwise, backslash is preserved?
                        // "The backslash shall be retained..."
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

    /**
     * Replaces $ARITHMETIC expressions.
     */
    expandArithmetic(text: string): string {
        // Regex for $((...))
        // Simple non-nested arithmetic support
        return text.replace(/\$\(\(([^)]+)\)\)/g, (match, expr) => {
            try {
                return this.arithmetic.evaluate(expr).toString();
            } catch (e) {
                // Return '0' for simplicity in this logic
                return '0';
            }
        });
    }

    /**
     * Replaces $VAR expressions.
     */
    expandVariables(text: string, env: { [key: string]: string }): string {
        return text.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*|[0-9]+|[#@*?])/g, (match, varName) => {
            return env[varName] || '';
        });
    }
}
