/**
 * NPCPopulator.ts - Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Population Engine (The Actors)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Assigns NPCs to nodes in the Lattice. Every workstation should belong
 * to a person with a name, a role, and a potential secret.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { WorldSeed } from './WorldSeed';
import { NetworkTopology, NodeType, LatticeNode } from '../../../entities/world/Lattice';
import { NPC } from '../../../entities/NPC';

export class NPCPopulator {
    private readonly ROLES = ["Lazy Sysadmin", "Paranoid CSO", "Clueless Intern", "Undercover Mole", "Researcher"];

    /**
     * Populates the topology with NPCs.
     * 
     * @param seed WorldSeed
     * @param topology The network graph to populate
     * @returns Array of generated NPCs
     */
    public populate(seed: WorldSeed, topology: NetworkTopology): NPC[] {
        const npcs: NPC[] = [];
        const workstations = topology.nodes.filter(n => n.type === NodeType.WORKSTATION);

        workstations.forEach(node => {
            const npc = this.generateNPC(seed, node);
            node.components.actorId = npc.id;
            npcs.push(npc);
        });

        return npcs;
    }

    private generateNPC(seed: WorldSeed, node: LatticeNode): NPC {
        const id = `npc_${node.id}`;
        const name = seed.pick(['Kaelen', 'Vash', 'Mira', 'Zane', 'Soren', 'Lyra', 'Mox', 'Jax', 'Raven', 'Echo']);
        const role = seed.pick(this.ROLES);

        return {
            id,
            name,
            origin: seed.pick(['Orbital Colony', 'Wasteland Outpost', 'Mega-City Slums', 'Corporate Ark']),
            career: role,
            loadout: seed.chance(0.3) ? ['Encrypted Keycard'] : ['Standard ID'],
            goal: seed.pick(['Keep system running', 'Leaked sensitive data', 'Avoid work', 'Maintain security']),
            status: 'active',
            traits: [seed.pick(['Determined', 'Paranoid', 'Lazy', 'Brilliant', 'Anxious'])],
            faction: node.factionId
        };
    }
}
