/**
 * CombinatorialDialogueAssembler.ts - Domain Service
 * 
 * Generates unique statements by recursively cross-multiplying
 * sentence segments and fragment pools.
 * 
 * Pillar: THE MASTER'S TOOL (Recursive Combinatorial Grammar)
 * Pillar: THE STORYTELLER'S CODE (Massive Variety)
 */

import { VariableTemplateEngine } from './VariableTemplateEngine';

export class CombinatorialDialogueAssembler {
    /**
     * @param fragmentPools - Map of tag keys to arrays of possible values.
     */
    constructor(private fragmentPools: Record<string, string[]>) {}

    /**
     * Assembles a final sentence from a template.
     * Supports multiple passes to allow segments to contain tags.
     */
    public assemble(template: string, variables: Record<string, string> = {}): string {
        let result = template;
        let iteration = 0;
        const MAX_ITERATIONS = 5; // Prevent infinite recursion

        // Multi-pass resolution: resolve tags until none remain or limit reached.
        while (result.includes('{') && iteration < MAX_ITERATIONS) {
            const context: Record<string, string> = { ...variables };
            const tags = result.match(/\{(\w+)\}/g) || [];
            
            for (const tag of tags) {
                const key = tag.slice(1, -1);
                
                // Only pick a random fragment if the variable wasn't explicitly provided
                if (this.fragmentPools[key] && !context[key]) {
                    const pool = this.fragmentPools[key];
                    context[key] = pool[Math.floor(Math.random() * pool.length)];
                }
            }

            const next = VariableTemplateEngine.render(result, context);
            if (next === result) break; // No more resolvable tags
            result = next;
            iteration++;
        }

        return result;
    }
}