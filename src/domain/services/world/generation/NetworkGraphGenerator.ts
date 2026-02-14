/**
 * NetworkGraphGenerator.ts - Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Topology Engine (The Skeleton)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Generates the network graph based on the Organization type and history.
 * Megacorps get hierarchical trees, DAOs get meshes, and Governments get stars.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { WorldSeed } from './WorldSeed';
import { HistoryContext, FactionType } from '../../../entities/world/HistoryContext';
import { NetworkTopology, LatticeNode, LatticeEdge, NodeType } from '../../../entities/world/Lattice';

export class NetworkGraphGenerator {
    /**
     * Generates a network topology from history.
     */
    public generate(seed: WorldSeed, history: HistoryContext): NetworkTopology {
        const nodes: LatticeNode[] = [];
        const edges: LatticeEdge[] = [];

        // Generate sub-graphs for each faction
        history.factions.forEach((faction, index) => {
            const { nodes: factionNodes, edges: factionEdges } = this.generateFactionSubGraph(seed, faction, index);
            nodes.push(...factionNodes);
            edges.push(...factionEdges);
        });

        // Connect factions based on conflicts (Inter-network links)
        history.conflicts.forEach(conflict => {
            if (conflict.type === 'NETWORK_MERGER' || conflict.type === 'DATA_BREACH') {
                const f1Nodes = nodes.filter(n => n.factionId === conflict.involvedFactions[0]);
                const f2Nodes = nodes.filter(n => n.factionId === conflict.involvedFactions[1]);
                
                if (f1Nodes.length > 0 && f2Nodes.length > 0) {
                    edges.push({
                        fromId: seed.pick(f1Nodes).id,
                        toId: seed.pick(f2Nodes).id,
                        latency: seed.range(20, 100)
                    });
                }
            }
        });

        return { nodes, edges };
    }

    private generateFactionSubGraph(seed: WorldSeed, faction: any, factionIndex: number): NetworkTopology {
        const nodes: LatticeNode[] = [];
        const edges: LatticeEdge[] = [];
        const nodeCount = seed.range(5, 12);
        const subnet = `10.${factionIndex}.${seed.range(0, 255)}`;

        // Root/Entry node
        const root = this.createNode(seed, faction.id, NodeType.ROUTER, `${subnet}.1`, `${faction.name.toLowerCase().replace(/\s+/g, '-')}-gw`);
        nodes.push(root);

        switch (faction.type) {
            case FactionType.MEGACORP:
                this.generateTreeTopology(seed, nodes, edges, root, nodeCount, subnet, faction.id);
                break;
            case FactionType.DAO:
                this.generateMeshTopology(seed, nodes, edges, nodeCount, subnet, faction.id);
                break;
            case FactionType.GOVERNMENT:
                this.generateStarTopology(seed, nodes, edges, root, nodeCount, subnet, faction.id);
                break;
            default:
                this.generateStarTopology(seed, nodes, edges, root, nodeCount, subnet, faction.id);
        }

        // Randomly assign one vendor node per faction
        const possibleVendors = nodes.filter(n => n.type === NodeType.SERVER || n.type === NodeType.WORKSTATION);
        if (possibleVendors.length > 0) {
            const vendor = seed.pick(possibleVendors);
            vendor.components.isVendor = true;
            vendor.components.inventory = ['autopwn.sh', 'decrypter.bin', 'scanner.bin'];
        }

        return { nodes, edges };
    }

    private generateTreeTopology(seed: WorldSeed, nodes: LatticeNode[], edges: LatticeEdge[], root: LatticeNode, count: number, subnet: string, factionId: string) {
        let parent = root;
        for (let i = 1; i < count; i++) {
            const node = this.createNode(seed, factionId, NodeType.SERVER, `${subnet}.${i + 1}`, `srv-${i}`);
            nodes.push(node);
            edges.push({ fromId: parent.id, toId: node.id, latency: 1 });
            if (seed.chance(0.3)) parent = node; // Branch out
        }
    }

    private generateStarTopology(seed: WorldSeed, nodes: LatticeNode[], edges: LatticeEdge[], root: LatticeNode, count: number, subnet: string, factionId: string) {
        for (let i = 1; i < count; i++) {
            const node = this.createNode(seed, factionId, NodeType.WORKSTATION, `${subnet}.${i + 1}`, `work-${i}`);
            nodes.push(node);
            edges.push({ fromId: root.id, toId: node.id, latency: 5 });
        }
    }

    private generateMeshTopology(seed: WorldSeed, nodes: LatticeNode[], edges: LatticeEdge[], count: number, subnet: string, factionId: string) {
        for (let i = 0; i < count; i++) {
            nodes.push(this.createNode(seed, factionId, NodeType.WORKSTATION, `${subnet}.${i + 1}`, `peer-${i}`));
        }
        // Connect each node to 2-3 others
        nodes.filter(n => n.factionId === factionId).forEach(node => {
            const others = nodes.filter(n => n.id !== node.id && n.factionId === factionId);
            for (let j = 0; j < seed.range(2, 3); j++) {
                const target = seed.pick(others);
                edges.push({ fromId: node.id, toId: target.id, latency: seed.range(10, 50) });
            }
        });
    }

    private createNode(seed: WorldSeed, factionId: string, type: NodeType, ip: string, hostname: string): LatticeNode {
        return {
            id: `node_${ip.replace(/\./g, '_')}`,
            hostname,
            ip,
            type,
            factionId,
            components: {
                cpuPower: seed.range(10, 100),
                securityLevel: seed.range(1, 10),
                osType: seed.pick(['UNIX', 'LINUX', 'BSD'])
            }
        };
    }
}
