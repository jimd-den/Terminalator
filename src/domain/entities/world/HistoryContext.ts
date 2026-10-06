/**
 * HistoryContext.ts - Domain Entity
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Digital Past (History Context)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Represents the simulated history of the procedural world. This context
 * determines the relationships between factions, the laws of the land,
 * and the "Legends" that left behind artifacts for the player to find.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export enum FactionType {
    MEGACORP = 'MEGACORP',
    DAO = 'DAO',
    SYNDICATE = 'SYNDICATE',
    GOVERNMENT = 'GOVERNMENT'
}

export interface Faction {
    id: string;
    name: string;
    type: FactionType;
    techStack: 'LEGACY' | 'CUTTING_EDGE' | 'VINTAGE';
    motto: string;
    influence: number; // 0-100
}

export enum ConflictType {
    ACQUISITION = 'ACQUISITION',
    DATA_BREACH = 'DATA_BREACH',
    NETWORK_MERGER = 'NETWORK_MERGER',
    SABOTAGE = 'SABOTAGE'
}

export interface Conflict {
    id: string;
    type: ConflictType;
    involvedFactions: string[]; // Faction IDs
    description: string;
    outcome: string;
}

export interface HistoryContext {
    seed: string;
    factions: Faction[];
    conflicts: Conflict[];
    globalLaws: {
        encryptionBanned: boolean;
        mandatorySurveillance: boolean;
    };
}
