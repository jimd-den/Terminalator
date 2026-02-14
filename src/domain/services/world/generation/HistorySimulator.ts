/**
 * HistorySimulator.ts - Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The History Generator (Macro-Simulation)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Simulates the "Digital History" of the world. This is Phase 1 of the
 * generation pipeline. It creates the narrative and political context
 * that informs the physical topology.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { WorldSeed } from './WorldSeed';
import { HistoryContext, Faction, FactionType, Conflict, ConflictType } from '../../../entities/world/HistoryContext';

export class HistorySimulator {
    private readonly CORPORATE_NAMES = ["AetherCorp", "OmniSys", "Hephaestus Industries", "NeuraLink", "Apex Solutions"];
    private readonly DAO_NAMES = ["The Mesh Collective", "Zero-Knowledge Foundation", "EtherGhosts", "PeerNode", "BitRunners"];
    private readonly SYNDICATE_NAMES = ["The Black Ice", "Nightshade", "Cipher-6", "DarkFlow", "UnderGrid"];
    private readonly GOV_NAMES = ["United Data Authority", "The Panopticon Council", "Directorate 9", "Global Trust", "SecureNet"];

    private readonly MOTTOS = [
        "Knowledge is Profit.",
        "Privacy is a Crime.",
        "The Network Never Sleeps.",
        "Code is Law.",
        "Efficiency Above All."
    ];

    /**
     * Simulates history and returns a deterministic context.
     * 
     * @param seed The WorldSeed instance.
     * @returns A generated HistoryContext.
     */
    public simulate(seed: WorldSeed, seedString: string): HistoryContext {
        const factions = this.generateFactions(seed);
        const conflicts = this.generateConflicts(seed, factions);
        
        return {
            seed: seedString,
            factions,
            conflicts,
            globalLaws: {
                encryptionBanned: seed.chance(0.3),
                mandatorySurveillance: seed.chance(0.5)
            }
        };
    }

    private generateFactions(seed: WorldSeed): Faction[] {
        const factions: Faction[] = [];
        const types = Object.values(FactionType);

        // Generate 3-5 factions
        const count = seed.range(3, 5);
        for (let i = 0; i < count; i++) {
            const type = seed.pick(types);
            let name = "";
            switch (type) {
                case FactionType.MEGACORP: name = seed.pick(this.CORPORATE_NAMES); break;
                case FactionType.DAO: name = seed.pick(this.DAO_NAMES); break;
                case FactionType.SYNDICATE: name = seed.pick(this.SYNDICATE_NAMES); break;
                case FactionType.GOVERNMENT: name = seed.pick(this.GOV_NAMES); break;
            }

            factions.push({
                id: `fac_${i}_${name.toLowerCase().replace(/\s+/g, '_')}`,
                name: name,
                type: type,
                techStack: seed.pick(['LEGACY', 'CUTTING_EDGE', 'VINTAGE']),
                motto: seed.pick(this.MOTTOS),
                influence: seed.range(10, 90)
            });
        }

        return factions;
    }

    private generateConflicts(seed: WorldSeed, factions: Faction[]): Conflict[] {
        const conflicts: Conflict[] = [];
        const conflictTypes = Object.values(ConflictType);

        // Generate 2-4 historical events
        const count = seed.range(2, 4);
        for (let i = 0; i < count; i++) {
            const type = seed.pick(conflictTypes);
            const fac1 = seed.pick(factions);
            const fac2 = seed.pick(factions.filter(f => f.id !== fac1.id));

            conflicts.push({
                id: `conflict_${i}`,
                type: type,
                involvedFactions: [fac1.id, fac2.id],
                description: this.generateConflictDescription(type, fac1, fac2),
                outcome: "The effects are still felt today in the network topology."
            });
        }

        return conflicts;
    }

    private generateConflictDescription(type: ConflictType, f1: Faction, f2: Faction): string {
        switch (type) {
            case ConflictType.ACQUISITION: return `${f1.name} hostilely acquired ${f2.name}'s data centers.`;
            case ConflictType.DATA_BREACH: return `${f1.name} suffered a catastrophic breach from ${f2.name}.`;
            case ConflictType.NETWORK_MERGER: return `The networks of ${f1.name} and ${f2.name} were forcibly combined.`;
            case ConflictType.SABOTAGE: return `${f1.name} covertly sabotaged ${f2.name}'s core mainframes.`;
        }
    }
}
