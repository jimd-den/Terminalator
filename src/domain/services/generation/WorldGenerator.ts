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
import { IUniverseStrategy, DiscoveredNode } from '../../interfaces/IUniverseStrategy';
import { InfiniteLattice } from '../world/lattice/InfiniteLattice';
import { LatticeAddress, formatAddress, parseAddress } from '../world/lattice/LatticeAddress';

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
 * Lazy, behaviour-based world generation over an unbounded coordinate space.
 *
 * Nothing is generated ahead of time and nothing is cached here: every answer
 * is derived on demand from (seed, address) by the InfiniteLattice. Hostnames
 * discovered through expansion are remembered only as an alias table, because a
 * name is knowledge the player acquired -- the node itself was always there.
 */
class DeterministicUniverseStrategy implements IUniverseStrategy {
    private readonly lattice: InfiniteLattice;

    /** hostname -> address, populated as the player discovers names. */
    private readonly aliases = new Map<string, string>();

    constructor(
        private seed: WorldSeed,
        private seedString: string,
        private graphGenerator: NetworkGraphGenerator,
        private hydrator: FileSystemHydrator,
        private npcPopulator: NPCPopulator
    ) {
        this.lattice = new InfiniteLattice(seed);

        // The home node's name is known from the outset; everything else must
        // be found by scanning.
        const home = this.lattice.home();
        this.remember(home);

        // The player's own machine answers to its diegetic names as well as its
        // derived one, so commands issued from the boot context resolve to a
        // real coordinate instead of falling off the lattice.
        const homeIp = formatAddress(home);
        ['terminalator', 'localhost'].forEach(n => this.aliases.set(n, homeIp));
    }

    public getSeed(): string {
        return this.seedString;
    }

    public deriveHome(): LatticeNode {
        const home = this.lattice.home();
        return this.lattice.nodeAt(home) ?? this.lattice.slice(home, 0).nodes[0];
    }

    /**
     * Resolves either a raw coordinate (always works, anywhere in the lattice)
     * or a hostname the player has already discovered.
     */
    private locate(target: string): LatticeAddress | undefined {
        const direct = this.lattice.resolveAddress(target);
        if (direct) return direct;

        const aliased = this.aliases.get(target.toLowerCase());
        return aliased ? parseAddress(aliased) : undefined;
    }

    private remember(addr: LatticeAddress): LatticeNode | undefined {
        const node = this.lattice.nodeAt(addr);
        if (node) this.aliases.set(node.hostname.toLowerCase(), node.ip);
        return node;
    }

    public getNodeDetails(hostname: string): LatticeNode | undefined {
        const addr = this.locate(hostname);
        if (!addr) return undefined;
        return this.remember(addr);
    }

    public expand(hostname: string, radius: number = 1): DiscoveredNode[] {
        const addr = this.locate(hostname);
        if (!addr) return [];

        const found = new Map<string, DiscoveredNode>();
        let frontier: LatticeAddress[] = [addr];
        const visited = new Set<string>([formatAddress(addr)]);

        for (let depth = 0; depth < Math.max(1, radius); depth++) {
            const next: LatticeAddress[] = [];
            for (const current of frontier) {
                for (const link of this.lattice.neighbors(current)) {
                    // Discovering a node teaches its name.
                    this.aliases.set(link.node.hostname.toLowerCase(), link.node.ip);
                    if (!found.has(link.node.ip)) {
                        found.set(link.node.ip, {
                            node: link.node,
                            latency: link.latency,
                            external: link.external
                        });
                    }
                    if (visited.has(link.node.ip)) continue;
                    visited.add(link.node.ip);
                    const parsed = parseAddress(link.node.ip);
                    if (parsed) next.push(parsed);
                }
            }
            frontier = next;
            if (frontier.length === 0) break;
        }

        return Array.from(found.values());
    }

    public mountFilesystem(hostname: string): FileSystem {
        const fs = new FileSystem();
        const node = this.getNodeDetails(hostname);
        if (node) {
            const fsService = new FileSystemService(fs);
            // Hydration is seeded per-node so a machine's contents are as stable
            // as the machine itself, and neighbours are derived (not stored) so
            // link files point somewhere real.
            const addr = parseAddress(node.ip);
            const neighbourNodes = addr
                ? this.lattice.neighbors(addr).slice(0, 8).map(l => l.node)
                : [];
            this.hydrator.hydrate(
                this.seed.derive('fs', node.ip),
                node,
                fsService,
                { nodes: [node, ...neighbourNodes], edges: [] },
                []
            );
        }
        return fs;
    }

    public getInitialHosts(): string[] {
        const home = this.deriveHome();
        // The player boots knowing their own machine and whatever their gateway
        // already advertises -- everything beyond that must be scanned for.
        const neighbours = this.expand(home.ip, 1)
            .filter(d => !d.external)
            .slice(0, 3)
            .map(d => d.node.hostname);
        return Array.from(new Set([home.hostname, ...neighbours]));
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
