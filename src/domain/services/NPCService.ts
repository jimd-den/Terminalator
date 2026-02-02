/**
 * NPCService - Domain Service
 * 
 * Manages the generation and lifecycle of NPCs (Non-Player Characters).
 * Ensures that NPCs are tracked and accessible to other domain services.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 */

import { NPC, NPCGenerator } from '../entities/NPC';

export class NPCService {
    private activeNPCs: NPC[] = [];

    /**
     * Generates and registers a new NPC.
     * @returns The newly created NPC.
     */
    public spawnNPC(): NPC {
        const npc = NPCGenerator.generate();
        this.activeNPCs.push(npc);
        return npc;
    }

    /**
     * Retrieves all currently active NPCs.
     */
    public getActiveNPCs(): NPC[] {
        return [...this.activeNPCs];
    }

    /**
     * Finds an NPC by their unique identifier.
     * @param id - The ID of the NPC to find.
     */
    public getNPCById(id: string): NPC | undefined {
        return this.activeNPCs.find(npc => npc.id === id);
    }
}
