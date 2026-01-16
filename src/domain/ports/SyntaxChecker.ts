/**
 * SyntaxChecker - Domain Layer Port
 * 
 * Defines the contract for static analysis of source files.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture) - Ports
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * Pillar: THE MASTER’S TOOL (Strategy Pattern)
 * 
 * Intent:
 * Decouples the editor from specific language validation rules.
 * Allows pluggable linters for different file formats.
 */

export interface SyntaxError {
    readonly line: number;      // 1-indexed
    readonly column: number;    // 1-indexed
    readonly message: string;
    readonly severity: 'error' | 'warning';
}

export interface SyntaxChecker {
    /**
     * The name of the language this checker supports (e.g., 'scheme', 'asm').
     */
    readonly language: string;

    /**
     * Performs static analysis on the source code.
     * 
     * @param source - The full source code of the file.
     * @returns An array of SyntaxErrors found.
     */
    check(source: string): SyntaxError[];
}
