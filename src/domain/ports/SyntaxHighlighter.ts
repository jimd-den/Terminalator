/**
 * SyntaxHighlighter - Domain Layer Port
 *
 * Defines the interface for syntax highlighting strategies.
 *
 * Pillar: The Master’s Tool (Pragmatic Design Patterns) - Strategy Pattern
 * Pillar: The Four-Fold Shield (Strict Architecture)
 *
 * Intent:
 * Allows the Vim editor to support multiple languages by plugging in 
 * different highlighting implementations without changing the core editor logic.
 */

export interface HighlightToken {
    text: string;
    type: 'keyword' | 'string' | 'comment' | 'number' | 'function' | 'operator' | 'plain';
    /**
     * Nesting depth, for languages where structure IS the syntax.
     *
     * Scheme sets this on parentheses so a renderer can colour them by depth.
     * In a language made of nested lists, matching brackets by eye is most of
     * the reading effort, and depth colour removes it.
     */
    depth?: number;
}

export interface SyntaxHighlighter {
    /**
     * The name of the language this highlighter supports (e.g., 'typescript', 'javascript', 'json').
     */
    readonly language: string;

    /**
     * Tokenizes a line of code for highlighting.
     * 
     * @param line - The raw line of text.
     * @returns An array of tokens with highlighting metadata.
     */
    highlight(line: string): HighlightToken[];
}

/**
 * A basic fallback highlighter that treats everything as plain text.
 */
export class PlainTextHighlighter implements SyntaxHighlighter {
    readonly language = 'plaintext';

    highlight(line: string): HighlightToken[] {
        return [{ text: line, type: 'plain' }];
    }
}
