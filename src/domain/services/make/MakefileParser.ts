/**
 * MakefileParser - Logic for parsing Makefile syntax.
 * 
 * Extracts targets, dependencies, recipes, and macros from Makefile content.
 * Adheres to SRP by isolating parsing from execution.
 * 
 * Pillar: The Four-Fold Shield (Clean Architecture)
 * Pillar: The Storyteller's Code (Literate Documentation)
 */

export interface MakeRule {
    target: string;
    dependencies: string[];
    recipes: string[];
}

export interface MakefileData {
    rules: Map<string, MakeRule>;
    macros: Map<string, string>;
    orderedTargets: string[];
}

export class MakefileParser {
    /**
     * Parses Makefile source text into a structured data object.
     */
    public parse(content: string, initialMacros: Map<string, string> = new Map()): MakefileData {
        const rules = new Map<string, MakeRule>();
        const macros = new Map<string, string>(initialMacros);
        const orderedTargets: string[] = [];
        let currentRule: MakeRule | null = null;

        const lines = content.split('\n');

        for (let line of lines) {
            // Handle comments
            const commentIdx = line.indexOf('#');
            if (commentIdx !== -1) line = line.substring(0, commentIdx);

            // Skip empty lines unless they are part of a recipe (starts with tab)
            if (!line.trim() && !line.startsWith('\t')) {
                currentRule = null;
                continue;
            }

            if (line.startsWith('\t')) {
                // Recipe line
                if (currentRule) {
                    currentRule.recipes.push(line.substring(1)); // Remove leading tab
                }
            } else if (line.includes(':') && !line.includes('=')) {
                // Target definition
                const parts = line.split(':');
                const targetStr = parts[0].trim();
                const depStr = parts.slice(1).join(':').trim();

                // Check for inline command (e.g., target: dep ; command)
                let deps = depStr;
                let inlineCmd = '';
                if (depStr.includes(';')) {
                    const dParts = depStr.split(';');
                    deps = dParts[0].trim();
                    inlineCmd = dParts.slice(1).join(';').trim();
                }

                const targetsInLine = targetStr.split(/\s+/).filter(t => t.length > 0);
                const dependencies = deps ? deps.split(/\s+/).filter(d => d.length > 0) : [];

                for (const t of targetsInLine) {
                    if (!rules.has(t)) {
                        rules.set(t, { target: t, dependencies: [], recipes: [] });
                        orderedTargets.push(t);
                    }
                    const rule = rules.get(t)!;
                    rule.dependencies.push(...dependencies);
                    if (inlineCmd) rule.recipes.push(inlineCmd);
                    currentRule = rule; // Recipes will apply to the last target in the line
                }
            } else if (line.includes('=')) {
                // Macro definition
                const parts = line.split('=');
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim();

                // Command-line macros (already in initialMacros) take precedence
                if (!macros.has(key)) {
                    macros.set(key, val);
                }
            } else {
                // Not a tabbed line, not a rule, not a macro - reset current rule
                currentRule = null;
            }
        }

        return { rules, macros, orderedTargets };
    }
}
