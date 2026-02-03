/**
 * IMissionDataProvider.ts - Domain Interface
 * 
 * Contract for retrieving mission templates and variable pools.
 * Allows decoupling the MissionRepository from specific data sources (JSON, API, Procedural Gen).
 * 
 * Pillar: Dependency Inversion (SOLID)
 */

export interface MissionTemplate {
    id: string;
    display_name: string;
    narrative_fallback: string;
    steps: {
        type: string;
        instructions: string;
        command: string;
        nextStep: string;
        cwd?: string;
    }[];
    templates: {
        description: string;
        reward: string;
    }[];
}

export interface IMissionDataProvider {
    /**
     * Retrieves a mission template by its archetype ID.
     */
    getTemplate(archetypeId: string): MissionTemplate | null;

    /**
     * Retrieves a pool of strings for variable injection.
     */
    getVariablePool(poolKey: string): string[];

    /**
     * Returns a list of all available archetype IDs.
     */
    getAllArchetypeIds(): string[];
}
