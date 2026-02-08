/**
 * JsonMissionDataProvider.ts - Infrastructure Adapter
 * 
 * Implementation of IMissionDataProvider that reads from the static JSON catalog.
 * 
 * Pillar: Dependency Inversion (SOLID)
 */

import MissionCatalog from '../../domain/data/MissionCatalog.json';
import { IMissionDataProvider, MissionTemplate } from '../../domain/interfaces/IMissionDataProvider';

export class JsonMissionDataProvider implements IMissionDataProvider {
    private catalog = MissionCatalog;

    /**
     * Retrieves a mission template by its archetype ID.
     */
    public getTemplate(archetypeId: string): MissionTemplate | null {
        // Cast to any to access dynamic keys safely, validation happens at runtime boundary if needed
        const template = (this.catalog.archetypes as any)[archetypeId];
        return template || null;
    }

    /**
     * Retrieves a pool of strings for variable injection.
     */
    public getVariablePool(poolKey: string): string[] {
        const pool = (this.catalog.variable_pools as any)[poolKey];
        return Array.isArray(pool) ? pool : [];
    }

    /**
     * Returns a list of all available archetype IDs.
     */
    public getAllArchetypeIds(): string[] {
        return Object.keys(this.catalog.archetypes);
    }
}
