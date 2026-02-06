/**
 * PersonaLoader.ts - Domain Adapter
 * 
 * Upgraded to support dynamic Variable Template rendering and
 * Combinatorial Dialogue assembly.
 * 
 * Pillar: THE MASTER'S TOOL (Combinatorial Factory)
 * Pillar: THE STORYTELLER'S CODE (Dynamic Dialogue)
 */

import { ITutorPersona } from '../../entities/tutor/ITutorPersona';
import { DialogueIntensity } from './IntensityCalculator';
import { CombinatorialDialogueAssembler } from './CombinatorialDialogueAssembler';

/**
 * Data structure for Persona definitions.
 */
export interface PersonaData {
    id: string;
    name: string;
    lines: Record<string, string[] | Partial<Record<DialogueIntensity, string[]>>>;
    config?: {
        commentChance?: number;
    }
}

export class PersonaLoader implements ITutorPersona {
    public id: string;
    public name: string;
    private lines: Record<string, string[] | Partial<Record<DialogueIntensity, string[]>>>;
    private assembler: CombinatorialDialogueAssembler;
    public config?: {
        commentChance?: number;
    };

    /**
     * @param data - Persona specific templates.
     * @param fragmentPools - Global library of words (insults, tips, etc.).
     */
    constructor(data: PersonaData, fragmentPools: Record<string, string[]> = {}) {
        this.id = data.id;
        this.name = data.name;
        this.lines = data.lines;
        this.config = data.config;
        this.assembler = new CombinatorialDialogueAssembler(fragmentPools);
    }

    /**
     * Retrieves a semantic reaction, assembled combinatorially.
     */
    getReaction(event: string, context?: { intensity?: DialogueIntensity, variables?: Record<string, string> }): string {
        const entry = this.lines[event];
        if (!entry) return "...";

        let pool: string[];

        // 1. Resolve Pool based on Intensity
        if (!Array.isArray(entry)) {
            const intensity = context?.intensity || DialogueIntensity.STANDARD;
            pool = entry[intensity] || entry[DialogueIntensity.STANDARD] || Object.values(entry)[0] as string[];
        } else {
            pool = entry;
        }

        if (!pool || pool.length === 0) return "...";

        // 2. Select Structure Template
        const template = pool[Math.floor(Math.random() * pool.length)];

        // 3. Assemble combinatorially (resolves {insult}, {tip}, etc. from pools)
        return this.assembler.assemble(template, context?.variables || {});
    }
}
