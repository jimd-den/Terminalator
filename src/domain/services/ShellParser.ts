/**
 * ShellParser Service - Domain Layer
 *
 * Responsible for parsing raw command strings into executable instructions.
 * Implements the Strategy Pattern (implied) for text interpretation.
 *
 * Pillar: The Storyteller’s Code (Literate Documentation)
 * Pillar: Performance & Purity (Deterministic string parsing)
 *
 * Intent:
 * Decouples the complexity of text parsing (tokenization, quoting, pipe splitting)
 * from the execution logic. This allows the shell language to evolve (e.g., adding
 * redirects, && operators) without breaking the command dispatcher.
 *
 * Parsing Strategy:
 * 1. Split by Pipe ('|')
 * 2. Tokenize arguments (handling ' and " quotes)
 * 3. Return a structured `ParsedCommand[]`
 */

export interface ParsedCommand {
    command: string;
    args: string[];
}

export class ShellParser {
    /**
     * Parses a raw input string into a chain of commands.
     *
     * @param input - The raw terminal input string.
     * @returns An array of parsed commands (pipeline).
     *
     * Complexity: O(n) - Single pass character scanning.
     */
    parse(input: string): ParsedCommand[] {
        if (!input.trim()) return [];

        const pipeParts = this.splitByPipe(input);
        return pipeParts.map(part => {
            const args = this.tokenize(part);
            const command = args.shift() || '';
            return { command, args };
        }).filter(cmd => cmd.command.length > 0);
    }

    /**
     * Splits input by the pipe character '|', respecting quotes.
     *
     * Why not `split('|')`?
     * Because "echo 'a | b'" should treat the pipe as literal text inside quotes.
     */
    private splitByPipe(input: string): string[] {
        const parts: string[] = [];
        let current = '';
        let inSingleQuote = false;
        let inDoubleQuote = false;

        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            if (char === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
            else if (char === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;

            if (char === '|' && !inSingleQuote && !inDoubleQuote) {
                parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current);
        return parts;
    }

    /**
     * Tokenizes a command string into [command, arg1, arg2...].
     * Handles whitespace and quotes.
     */
    private tokenize(input: string): string[] {
        const args: string[] = [];
        let current = '';
        let inSingleQuote = false;
        let inDoubleQuote = false;

        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
                if (current.length > 0) {
                    args.push(current);
                    current = '';
                }
            } else if (char === "'" && !inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
                // Quote removal: We do NOT append the quote char to 'current'
            } else if (char === '"' && !inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
                // Quote removal: We do NOT append the quote char to 'current'
            } else {
                current += char;
            }
        }

        if (current.length > 0) args.push(current);
        return args;
    }
}
