/**
 * TopologyGenerator - Domain Service
 * 
 * Generates the abstract graph of the world.
 * "The Skeleton" of the pipeline.
 * 
 * Pillar: The Four-Fold Shield (Enterprise Logic)
 */

export interface TopologyNode {
    id: string;
    type: 'HUB' | 'CORRIDOR' | 'ROOM';
    connections: string[]; // Connected Node IDs
}

export interface Topology {
    nodes: TopologyNode[];
    rootId: string;
}

export class TopologyGenerator {
    /**
     * Generates a Star topology (Hub and Spoke).
     */
    public generateStar(rng: () => number, size: number): Topology {
        const rootId = 'node_hub';
        const nodes: TopologyNode[] = [{ id: rootId, type: 'HUB', connections: [] }];

        for (let i = 0; i < size; i++) {
            const nodeId = `node_${i}`;
            const node: TopologyNode = { id: nodeId, type: 'ROOM', connections: [rootId] };
            nodes.push(node);
            nodes[0].connections.push(nodeId);
        }

        return { nodes, rootId };
    }

    /**
     * Generates a Linear topology (Corridor).
     */
    public generateLinear(rng: () => number, size: number): Topology {
        const rootId = 'node_0';
        const nodes: TopologyNode[] = [];

        for (let i = 0; i < size; i++) {
            const nodeId = `node_${i}`;
            const connections: string[] = [];
            if (i > 0) connections.push(`node_${i-1}`);
            if (i < size - 1) connections.push(`node_${i+1}`);
            
            nodes.push({ id: nodeId, type: 'ROOM', connections });
        }

        return { nodes, rootId };
    }
}
