/**
 * Lattice.ts - Domain Entity
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Network Skeleton (The Lattice)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Represents the physical and logical topology of the procedurally generated
 * world. This is the ECS-style structure for nodes in the Lattice.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { FactionType } from './HistoryContext';

export enum NodeType {
    WORKSTATION = 'WORKSTATION',
    SERVER = 'SERVER',
    ROUTER = 'ROUTER',
    MAINFRAME = 'MAINFRAME',
    IOT_DEVICE = 'IOT_DEVICE'
}

export interface LatticeNode {
    id: string;
    hostname: string;
    ip: string;
    type: NodeType;
    factionId: string;
    
    // ECS Components
    components: {
        actorId?: string; // ID of the NPC assigned to this node
        isVendor?: boolean;
        inventory?: string[]; // List of Tool IDs
        cpuPower: number; // For mining calculations (1-100)
        securityLevel: number; // 1-10
        osType: 'UNIX' | 'LINUX' | 'BSD' | 'SOLARIS';
    };
}

export interface LatticeEdge {
    fromId: string;
    toId: string;
    latency: number;
}

export interface NetworkTopology {
    nodes: LatticeNode[];
    edges: LatticeEdge[];
}
