/**
 * CombinatorialDialogueAssembler.ts - Domain Service
 * 
 * Generates unique statements by cross-multiplying sentence structures
 * with fragment pools (e.g., insults, tips, fillers).
 * 
 * Pillar: THE MASTER'S TOOL (Combinatorial Grammar)
 * Pillar: THE STORYTELLER'S CODE (Dynamic Dialogue)
 */

import { VariableTemplateEngine } from './VariableTemplateEngine';

export class CombinatorialDialogueAssembler {
    /**
     * @param fragmentPools - Map of tag keys to arrays of possible values.
     * e.g. { insult: ["worm", "failure"], tip: ["Check man.", "Check syntax."] }
     */
    constructor(private fragmentPools: Record<string, string[]>) {}

    /**
     * Assembles a final sentence from a template.
     * 1. Detects fragment tags (e.g., {insult}).
     * 2. Picks random values for tags not provided in variables.
     * 3. Renders the final string.
     */
    public assemble(template: string, variables: Record<string, string> = {}): string {
        const combinedContext = { ...variables };
        
        // Find all tags in the template
        const tags = template.match(/\{(\w+)\}/g) || [];
        
        for (const tag of tags) {
            const key = tag.slice(1, -1);
            
            // If the tag corresponds to a fragment pool and wasn't provided as a variable
            if (this.fragmentPools[key] && !combinedContext[key]) {
                const pool = this.fragmentPools[key];
                combinedContext[key] = pool[Math.floor(Math.random() * pool.length)];
            }
        }

        return VariableTemplateEngine.render(template, combinedContext);
    }
}
