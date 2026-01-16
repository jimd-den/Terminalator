/**
 * HighlighterRegistry - Interface Adapter Layer
 *
 * Manages the available syntax highlighters and selects the appropriate one
 * based on file extensions.
 *
 * Pillar: The Master’s Tool (Factory/Registry Pattern)
 * Pillar: The Four-Fold Shield (Strict Architecture)
 */

import { SyntaxHighlighter, PlainTextHighlighter } from '../../domain/ports/SyntaxHighlighter';
import { TypescriptHighlighter } from './highlighters/TypescriptHighlighter';
import { SchemeHighlighter } from './highlighters/SchemeHighlighter';
import { AsmHighlighter } from './highlighters/AsmHighlighter';

export class HighlighterRegistry {
    private highlighters: Map<string, SyntaxHighlighter> = new Map();
    private extensionMap: Map<string, string> = new Map();

    constructor() {
        this.register(new PlainTextHighlighter());
        this.register(new TypescriptHighlighter());
        this.register(new SchemeHighlighter());
        this.register(new AsmHighlighter());

        // Map extensions
        this.extensionMap.set('ts', 'typescript');
        this.extensionMap.set('tsx', 'typescript');
        this.extensionMap.set('js', 'typescript'); // Basic highlighing works for JS too
        this.extensionMap.set('jsx', 'typescript');
        this.extensionMap.set('scm', 'scheme');
        this.extensionMap.set('scheme', 'scheme');
        this.extensionMap.set('s', 'asm');
        this.extensionMap.set('asm', 'asm');
    }

    register(highlighter: SyntaxHighlighter): void {
        this.highlighters.set(highlighter.language, highlighter);
    }

    getHighlighterForFile(filename: string): SyntaxHighlighter {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const language = this.extensionMap.get(ext) || 'plaintext';
        return this.highlighters.get(language) || new PlainTextHighlighter();
    }
}
