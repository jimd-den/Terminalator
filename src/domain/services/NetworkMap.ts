/**
 * NetworkMap Service - Domain Layer
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Player's Knowledge Of The Lattice (Not The Lattice Itself)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This class used to *be* the world: a Map of whatever had been generated so
 * far, which meant `getAllHosts()` -- the thing net-scan printed -- could only
 * ever return the handful of hosts booted at startup. The infinite lattice was
 * sitting right there and no command could see it.
 *
 * Now it is a projection: an IUniverseStrategy is the single authority on what
 * exists, and NetworkMap remembers only two things on top of it -- which hosts
 * the player has *discovered*, and the mutable filesystems of hosts they have
 * actually touched. Discovery is knowledge; existence is derivation.
 *
 * The distinction matters for saves, too: the discovered set is small and
 * serialisable, while the world it indexes is unbounded and needs no storage.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { FileSystem } from '../entities/FileSystem';
import { SystemGenerator } from './SystemGenerator';
import { FileSystemService } from './FileSystemService';
import { IUniverseStrategy, DiscoveredNode } from '../interfaces/IUniverseStrategy';
import { LatticeNode } from '../entities/world/Lattice';

export class NetworkMap {
    /** Hosts whose filesystem has been materialised and may have been edited. */
    private systems: Map<string, FileSystem> = new Map();

    /** Hostnames the player has seen. Existence != discovery. */
    private discovered: Set<string> = new Set();

    private systemGenerator: SystemGenerator;
    private universe?: IUniverseStrategy;

    constructor(universe?: IUniverseStrategy) {
        this.systemGenerator = new SystemGenerator();
        if (universe) this.attachUniverse(universe);
    }

    /**
     * Binds this map to the universe that defines what exists. Wired late by
     * the composition root, since WorldManager owns the strategy instance.
     */
    public attachUniverse(universe: IUniverseStrategy): void {
        this.universe = universe;
        universe.getInitialHosts().forEach(h => this.discovered.add(h));
    }

    public getUniverse(): IUniverseStrategy | undefined {
        return this.universe;
    }

    /**
     * Retrieves a system by hostname or lattice address.
     *
     * Resolution order: an already-mounted filesystem, then the universe (which
     * can derive any coordinate in existence), then the legacy on-demand
     * generator for hosts that predate the lattice.
     */
    getSystem(hostname: string): FileSystem | undefined {
        if (this.systems.has(hostname)) {
            return this.systems.get(hostname);
        }

        if (hostname === 'localhost' || hostname === 'test') {
            return undefined;
        }

        // The lattice is the authority: if it can derive the coordinate, the
        // machine is real and can be mounted, however far away it is.
        if (this.universe) {
            const node = this.universe.getNodeDetails(hostname);
            if (node) {
                const fs = this.universe.mountFilesystem(hostname);
                this.systems.set(hostname, fs);
                this.discovered.add(node.hostname);
                return fs;
            }
            // Not derivable: an unknown name is a genuinely unreachable host.
            return undefined;
        }

        // ── Legacy fallback (no universe attached) ────────────────────────────
        let faction = 'corporate';
        if (hostname.includes('mil') || hostname.includes('SEC') || hostname.includes('CMD')) faction = 'military';
        if (hostname.includes('research') || hostname.includes('LAB') || hostname.includes('BIO')) faction = 'research';

        const fs = this.systemGenerator.generate({ difficulty: 1, faction });
        const service = new FileSystemService(fs);
        service.writeFile('/etc/hostname', hostname, 'w');

        this.systems.set(hostname, fs);
        this.discovered.add(hostname);
        return fs;
    }

    registerSystem(hostname: string, fs: FileSystem) {
        this.systems.set(hostname, fs);
        this.discovered.add(hostname);
    }

    /**
     * Derives the neighbours of a host and records them as discovered.
     * This is what turns net-scan from a listing into an act of exploration.
     */
    public discover(fromHost: string, radius: number = 1): DiscoveredNode[] {
        if (!this.universe) return [];
        const found = this.universe.expand(fromHost, radius);
        found.forEach(d => this.discovered.add(d.node.hostname));
        return found;
    }

    /**
     * Node metadata for a host, derived rather than stored.
     */
    public getNode(hostname: string): LatticeNode | undefined {
        return this.universe?.getNodeDetails(hostname);
    }

    /**
     * Every host the player currently knows about.
     *
     * Note this is deliberately NOT "every host that exists" -- that set is
     * unbounded and cannot be listed. Commands that want more should call
     * discover() and widen the player's knowledge.
     */
    public getAllHosts(): string[] {
        const hosts = new Set<string>([...this.discovered, ...this.systems.keys()]);
        return Array.from(hosts);
    }

    public isDiscovered(hostname: string): boolean {
        return this.discovered.has(hostname);
    }
}
