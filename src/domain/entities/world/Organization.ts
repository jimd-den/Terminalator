/**
 * Organization.ts - Domain Entity
 * 
 * Represents a high-level political or corporate entity in the world.
 * Examples: Mega-Corporations, Governments, Syndicates.
 * 
 * Pillar: The Four-Fold Shield (Enterprise Logic)
 */

export enum OrganizationType {
    CORPORATION = 'CORPORATION',
    GOVERNMENT = 'GOVERNMENT',
    SYNDICATE = 'SYNDICATE',
    ACADEMIC = 'ACADEMIC'
}

export interface Organization {
    id: string;
    name: string;
    type: OrganizationType;
    
    /**
     * Technical sophistication level (1-10).
     * Determines the complexity of their systems and encryption.
     */
    techLevel: number;

    /**
     * Wealth level. Determines the reward/bounty size.
     */
    wealth: number;

    /**
     * List of owned Host IDs (Servers/Stations).
     */
    assets: string[];

    /**
     * Relationships with other orgs.
     * Key: Organization ID, Value: -100 (War) to +100 (Alliance)
     */
    relationships: Record<string, number>;
}
