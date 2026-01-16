/**
 * CheckerRegistry - Interface Adapter Layer
 * 
 * Maps file extensions to their respective SyntaxChecker implementations.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture) - Adapters
 * Pillar: THE MASTER’S TOOL (Strategy Pattern)
 * Pillar: THE BALANCED SCALE (SOLID)
 */

import { SyntaxChecker } from '../../domain/ports/SyntaxChecker';
import { SchemeChecker } from '../../domain/usecases/SchemeChecker';
import { AsmChecker } from '../../domain/usecases/asm/AsmChecker';

export class CheckerRegistry {
    private checkers: Map<string, SyntaxChecker> = new Map();
    private extensionMap: Map<string, string> = new Map();

    constructor() {
        this.register(new SchemeChecker());
        this.register(new AsmChecker());

        // Map extensions to language names
        this.extensionMap.set('scm', 'scheme');
        this.extensionMap.set('scheme', 'scheme');
        this.extensionMap.set('s', 'asm');
        this.extensionMap.set('asm', 'asm');
    }

    private register(checker: SyntaxChecker): void {
        this.checkers.set(checker.language, checker);
    }

    /**
     * Finds a checker based on file extension.
     */
    getCheckerForExtension(ext: string): SyntaxChecker | null {
        const language = this.extensionMap.get(ext.toLowerCase());
        if (!language) return null;
        return this.checkers.get(language) || null;
    }
}
