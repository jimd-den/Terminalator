/**
 * NPC Entity - Domain Layer
 * 
 * Represents a procedurally generated character in the 24XX system.
 * Characters are randomly generated NPCs that the terminal operator (player)
 * assists or manages.
 *
 * Pillar: The Storyteller’s Code (Literate Documentation)
 * Pillar: The Swift Stream (Performance & Purity)
 *
 * Intent:
 * The NPC system drives the narrative engine. Each NPC is a discrete entity
 * with motivations (goals) and backgrounds (origin/career). The randomness
 * ensures replayability and variety in missions.
 */

export interface NPC {
    id: string;
    name: string;
    origin: string;
    career: string;
    loadout: string[];
    goal: string;
    status: 'active' | 'mia' | 'terminated' | 'retired';
    traits: string[];
}

export class NPCGenerator {
    private static names = ['Kaelen', 'Vash', 'Mira', 'Zane', 'Soren', 'Lyra', 'Mox', 'Jax'];
    private static origins = ['Orbital Colony', 'Wasteland Outpost', 'Mega-City Slums', 'Corporate Ark'];
    private static careers = ['Data Courier', 'Scav Tech', 'Void Pilot', 'Black-Ops Medic'];
    private static goals = ['Recover lost data', 'Extract biological sample', 'Sabotage rival server', 'Espionage'];

    /**
     * Generates a new random NPC.
     * Uses Math.random for procedural generation.
     *
     * @returns A new NPC object with randomized attributes.
     */
    static generate(): NPC {
        const id = Math.random().toString(36).substring(2, 9).toUpperCase();
        return {
            id,
            name: this.names[Math.floor(Math.random() * this.names.length)],
            origin: this.origins[Math.floor(Math.random() * this.origins.length)],
            career: this.careers[Math.floor(Math.random() * this.careers.length)],
            loadout: ['Pulse Link', 'Access Card'],
            goal: this.goals[Math.floor(Math.random() * this.goals.length)],
            status: 'active',
            traits: ['Determined', 'Paranoid'],
        };
    }
}
