/**
 * WorldGenerator.ts - Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Big Bang (Procedural Pipeline Orchestrator)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Refactored to use the Neo-Retro Lattice specification.
 * Pipeline: Seed -> History -> Topology -> Population -> Hydration.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { WorldSeed } from '../world/generation/WorldSeed';
import { HistorySimulator } from '../world/generation/HistorySimulator';
import { NetworkGraphGenerator } from '../world/generation/NetworkGraphGenerator';
import { NPCPopulator } from '../world/generation/NPCPopulator';
import { FileSystemHydrator } from '../world/generation/FileSystemHydrator';
import { NetworkTopology, LatticeNode, NodeType } from '../../entities/world/Lattice';
import { Location, LocationType } from '../../entities/world/Location';
import { Device, DeviceType } from '../../entities/world/Device';
import { Connection, ConnectionType } from '../../entities/world/Connection';
import { NPC } from '../../entities/NPC';
import { FileSystemService } from '../FileSystemService';

import { FileSystem } from '../../entities/FileSystem';
import { IUniverseStrategy } from '../../interfaces/IUniverseStrategy';

export interface GeneratedWorld {
    locations: Location[];
    devices: Device[];
    connections: Connection[];
    topology: NetworkTopology;
    npcs: NPC[];
}

/**
 * DeterministicUniverseStrategy
 * 
 * Implements lazy, behavior-based world generation.
 */
class DeterministicUniverseStrategy implements IUniverseStrategy {
    constructor(
        private seed: WorldSeed,
        private seedString: string,
        private graphGenerator: NetworkGraphGenerator,
        private hydrator: FileSystemHydrator,
        private npcPopulator: NPCPopulator
    ) {}

    public getNodeDetails(hostname: string): LatticeNode | undefined {
        return this.graphGenerator.findNodeByHostname(this.seed, hostname);
    }

    public mountFilesystem(hostname: string): FileSystem {
        const fs = new FileSystem();
        const node = this.getNodeDetails(hostname);
        if (node) {
            // Lazy Hydration
            const fsService = new FileSystemService(fs);
            // We provide empty topology/npcs for lazy hydration unless we want to generate neighbors
            this.hydrator.hydrate(this.seed, node, fsService, { nodes: [node], edges: [] }, []);
        }
        return fs;
    }

    public getInitialHosts(): string[] {
        // Return a set of "starting" hosts that are always available
        return ['terminalator', 'gateway-alpha', 'research-srv-1'];
    }
}

export class WorldGenerator {
    private historySimulator = new HistorySimulator();
    private graphGenerator = new NetworkGraphGenerator();
    private npcPopulator = new NPCPopulator();
    private hydrator = new FileSystemHydrator();

    /**
     * Creates a lazy Universe Strategy.
     * Pillar: THE MASTER'S TOOL (Stateless Factory)
     */
    public createUniverse(seedString: string): IUniverseStrategy {
        const seed = new WorldSeed(seedString);
        return new DeterministicUniverseStrategy(
            seed,
            seedString,
            this.graphGenerator,
            this.hydrator,
            this.npcPopulator
        );
    }

    /**
     * Generates a complete world lattice based on a seed.
     * @deprecated Use createUniverse for infinite scaling.
     */
    public generateWorld(seedString: string): GeneratedWorld {
        const seed = new WorldSeed(seedString);
        
        // Phase 1: History
        const history = this.historySimulator.simulate(seed, seedString);
        
        // Phase 2 & 3: Topology & Population
        const topology = this.graphGenerator.generate(seed, history);
        const npcs = this.npcPopulator.populate(seed, topology);

        // Map Lattice to Legacy Entities (for UI/GameManager compatibility)
        const locations: Location[] = [];
        const devices: Device[] = [];
        const connections: Connection[] = [];

        topology.nodes.forEach(node => {
            const locId = `loc_${node.id}`;
            locations.push({
                id: locId,
                name: `${node.hostname.toUpperCase()} AREA`,
                type: node.type === NodeType.ROUTER ? LocationType.STATION : LocationType.ROOM,
                description: `Digital presence of ${node.hostname}. Faction: ${node.factionId}`,
                controllingHost: node.hostname,
                state: { owner: node.factionId }
            });

            devices.push({
                id: `dev_${node.id}`,
                name: node.hostname,
                type: DeviceType.TERMINAL,
                path: `/dev/${node.hostname}`,
                locationId: locId,
                hostId: node.hostname,
                state: 'ACTIVE'
            });
        });

        topology.edges.forEach((edge, i) => {
            connections.push({
                id: `conn_${i}`,
                fromId: `loc_${edge.fromId}`,
                toId: `loc_${edge.toId}`,
                type: ConnectionType.PHYSICAL,
                properties: { latency: edge.latency }
            });
        });

        return { locations, devices, connections, topology, npcs };
    }

    /**
     * Hydrates the file systems of the generated world.
     */
    public hydrateWorld(seedString: string, world: GeneratedWorld, getFsService: (hostname: string) => FileSystemService): void {
        const seed = new WorldSeed(seedString);
        world.topology.nodes.forEach(node => {
            const fs = getFsService(node.hostname);
            this.hydrator.hydrate(seed, node, fs, world.topology, world.npcs);
        });
    }

    /**
     * Legacy Compatibility: Generates a station cluster.
     */
    public generateStation(seed: string, theme?: any): GeneratedWorld {
        return this.generateWorld(seed);
    }
}
