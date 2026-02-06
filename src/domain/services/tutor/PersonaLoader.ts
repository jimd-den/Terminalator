/**
 * PersonaLoader.ts - Domain Adapter
 * 
 * Upgraded to support dynamic Variable Template rendering and
 * Intensity-aware dialogue selection.
 * 
 * Pillar: THE STORYTELLER'S CODE (Dynamic Dialogue)
 */

import { ITutorPersona } from '../../entities/tutor/ITutorPersona';
import { VariableTemplateEngine } from './VariableTemplateEngine';
import { DialogueIntensity } from './IntensityCalculator';

/**
 * Data structure for Persona definitions.
 * Supports legacy string arrays or modern Intensity mappings.
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
    public config?: {
        commentChance?: number;
    };

    constructor(data: PersonaData) {
        this.id = data.id;
        this.name = data.name;
        this.lines = data.lines;
        this.config = data.config;
    }

    /**
     * Retrieves a semantic reaction, rendered with context variables.
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

        // 2. Select Template
        const template = pool[Math.floor(Math.random() * pool.length)];

        // 3. Render with Variables
        return VariableTemplateEngine.render(template, context?.variables || {});
    }
}