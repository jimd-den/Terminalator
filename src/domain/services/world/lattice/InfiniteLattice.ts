/**
 * InfiniteLattice.ts - Domain Service
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * Generation As Behaviour, Not State
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The previous pipeline built a finite graph up front and then handed queries a
 * snapshot of it, so the world was exactly as large as whatever had already
 * been generated. This service inverts that: nothing is stored. Every question
 * -- what is at this coordinate, what is next to it, who owns it -- is answered
 * by hashing the coordinate against the world seed at the moment it is asked.
 *
 * Consequences worth stating plainly:
 *
 *   * Node 9,000,000 costs the same to derive as node 1. There is no cursor to
 *     advance and no prefix of the world to build first.
 *   * The same seed yields the same universe forever, on any device, in any
 *     order of exploration -- because no query can disturb another.
 *   * Gateways emit long-haul links into other subnets and, occasionally, other
 *     sectors. Since sectors are unbounded integers, no walk can exhaust the
 *     reachable set: expansion always produces somewhere new to go.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { WorldSeed } from '../generation/WorldSeed';
import { LatticeNode, LatticeEdge, NodeType, NetworkTopology } from '../../../entities/world/Lattice';
import { FactionForge, LatticeFaction, LatticeFactionType } from './FactionForge';
import {
    LatticeAddress, formatAddress, parseAddress, subnetOf,
    gatewayOf, isGateway, makeAddress, addressEquals, HOSTS_PER_SUBNET
} from './LatticeAddress';

const OS_TYPES: Array<'UNIX' | 'LINUX' | 'BSD' | 'SOLARIS'> = ['UNIX', 'LINUX', 'BSD', 'SOLARIS'];

const ROLE_BY_TYPE: Record<NodeType, string> = {
    [NodeType.ROUTER]: 'gw',
    [NodeType.SERVER]: 'srv',
    [NodeType.WORKSTATION]: 'ws',
    [NodeType.MAINFRAME]: 'mf',
    [NodeType.IOT_DEVICE]: 'iot'
};

/** A neighbour reached from some origin, with the cost of getting there. */
export interface LatticeLink {
    node: LatticeNode;
    latency: number;
    /** True when the hop crosses out of the origin's subnet. */
    external: boolean;
}

export class InfiniteLattice {
    private readonly forge = new FactionForge();

    constructor(private readonly seed: WorldSeed) {}

    // ─────────────────────────────────────────────────────────────────────────
    // Home
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * The player's starting coordinate, derived from the seed rather than
     * hardcoded. Different seed, different home subnet.
     */
    public home(): LatticeAddress {
        return makeAddress(
            0,
            10,
            this.seed.hashRange(0, 255, 'home', 'b'),
            this.seed.hashRange(0, 255, 'home', 'c'),
            2
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Derivation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Whether a coordinate holds a live machine. Dark addresses are what make
     * scanning feel like scanning -- a subnet is populated, not saturated.
     * Host .1 (the gateway) and the player's home are always live so the world
     * is guaranteed navigable.
     */
    public isLive(addr: LatticeAddress): boolean {
        if (addr.d === 0 || addr.d === 255) return false;   // network + broadcast
        if (isGateway(addr)) return true;
        if (addressEquals(addr, this.home())) return true;
        const density = this.subnetDensity(addr);
        return this.seed.hash('live', formatAddress(addr)) < density;
    }

    /** How full a subnet is: sparse frontier vs. dense corporate campus. */
    public subnetDensity(addr: LatticeAddress): number {
        return 0.05 + this.seed.hash('density', subnetOf(addr)) * 0.35;
    }

    /** The faction owning a coordinate's subnet. */
    public factionAt(addr: LatticeAddress): LatticeFaction {
        return this.forge.forge(this.seed, subnetOf(addr));
    }

    /**
     * Derives the full node at a coordinate. Pure: same seed + same address
     * yields a byte-identical node, no matter what else has been queried.
     * Returns undefined for dark addresses.
     */
    public nodeAt(addr: LatticeAddress): LatticeNode | undefined {
        if (!this.isLive(addr)) return undefined;
        return this.deriveNode(addr);
    }

    /**
     * Derives a node ignoring liveness -- used for the guaranteed-live home and
     * for gateways, which always answer.
     */
    private deriveNode(addr: LatticeAddress): LatticeNode {
        const key = formatAddress(addr);
        const faction = this.factionAt(addr);
        const type = this.typeAt(addr, faction);

        // Security scales with the faction's own posture plus a per-node jitter,
        // so a hardened org is hard everywhere without being uniform.
        const security = Math.max(1, Math.min(10,
            Math.round(faction.security * 0.6 + this.seed.hashRange(0, 6, 'sec', key))
        ));

        // Vendors are rare and deterministic: one address in a subnet wins the
        // draw, so a player can learn where to shop and return to it.
        const isVendor = !isGateway(addr) &&
            this.seed.hashRange(2, HOSTS_PER_SUBNET - 2, 'vendor', subnetOf(addr)) === addr.d;

        return {
            id: `node_${key}`,
            hostname: this.hostnameFor(addr, faction, type),
            ip: key,
            type,
            factionId: faction.id,
            components: {
                cpuPower: this.seed.hashRange(10, 100, 'cpu', key),
                securityLevel: security,
                osType: this.seed.hashPick(OS_TYPES, 'os', key),
                ...(isVendor ? {
                    isVendor: true,
                    inventory: this.inventoryFor(addr)
                } : {})
            }
        };
    }

    private typeAt(addr: LatticeAddress, faction: LatticeFaction): NodeType {
        if (isGateway(addr)) return NodeType.ROUTER;
        // The player's own machine is always a workstation -- starting life as a
        // derived thermostat would be funny exactly once.
        if (addressEquals(addr, this.home())) return NodeType.WORKSTATION;

        const roll = this.seed.hash('type', formatAddress(addr));
        // Megacorps and governments run mainframes; DAOs and remnants do not.
        const heavy = faction.type === LatticeFactionType.MEGACORP ||
                      faction.type === LatticeFactionType.GOVERNMENT;

        if (heavy && roll < 0.06) return NodeType.MAINFRAME;
        if (roll < 0.35) return NodeType.SERVER;
        if (roll < 0.85) return NodeType.WORKSTATION;
        return NodeType.IOT_DEVICE;
    }

    private inventoryFor(addr: LatticeAddress): string[] {
        const stock = ['autopwn.sh', 'decrypter.bin', 'scanner.bin', 'tracer.bin', 'ghost.bin'];
        const count = this.seed.hashRange(1, 3, 'stock', formatAddress(addr));
        const picked: string[] = [];
        for (let i = 0; i < count; i++) {
            const item = this.seed.hashPick(stock, 'stock', formatAddress(addr), i);
            if (!picked.includes(item)) picked.push(item);
        }
        return picked;
    }

    /**
     * Hostnames are derived aliases of a coordinate, shaped like a real org's
     * naming convention: <faction-slug>-<role><n>.
     */
    private hostnameFor(addr: LatticeAddress, faction: LatticeFaction, type: NodeType): string {
        const stem = faction.slug.split('-')[0];
        return isGateway(addr)
            ? `${stem}-gw`
            : `${stem}-${ROLE_BY_TYPE[type]}${addr.d}`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Expansion (the behaviour that replaces a stored graph)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Derives the neighbours of a coordinate.
     *
     * Intra-subnet shape follows the owning faction's character -- a star for
     * governments, a chain for megacorps, a mesh for DAOs -- so topology varies
     * without a topology table. Gateways additionally emit long-haul links to
     * other subnets and, rarely, other sectors: that is the escape hatch that
     * keeps the reachable world unbounded.
     */
    public neighbors(addr: LatticeAddress): LatticeLink[] {
        const links: LatticeLink[] = [];
        const seen = new Set<string>([formatAddress(addr)]);

        const push = (target: LatticeAddress, latency: number, external: boolean) => {
            const key = formatAddress(target);
            if (seen.has(key)) return;
            const node = this.nodeAt(target);
            if (!node) return;
            seen.add(key);
            links.push({ node, latency, external });
        };

        const faction = this.factionAt(addr);
        const gw = gatewayOf(addr);

        if (!isGateway(addr)) {
            // Everything reaches its own gateway.
            push(gw, this.seed.hashRange(1, 6, 'lat', formatAddress(addr), 'gw'), false);

            if (faction.type === LatticeFactionType.DAO) {
                // Mesh: peer sideways with a handful of neighbours.
                const peers = this.seed.hashRange(2, 4, 'mesh', formatAddress(addr));
                for (let i = 0; i < peers; i++) {
                    const d = this.seed.hashRange(2, HOSTS_PER_SUBNET - 2, 'mesh', formatAddress(addr), i);
                    push({ ...addr, d }, this.seed.hashRange(5, 40, 'lat', formatAddress(addr), 'p', i), false);
                }
            } else if (faction.type === LatticeFactionType.MEGACORP) {
                // Tree: adjacent rungs of the hierarchy.
                if (addr.d > 2) push({ ...addr, d: addr.d - 1 }, this.seed.hashRange(1, 10, 'lat', formatAddress(addr), 'up'), false);
                if (addr.d < HOSTS_PER_SUBNET - 2) push({ ...addr, d: addr.d + 1 }, this.seed.hashRange(1, 10, 'lat', formatAddress(addr), 'dn'), false);
            }
            // Star factions (government et al.) reach only the hub -- already added.
        } else {
            // A gateway sees the live hosts of its own subnet.
            for (let d = 2; d < HOSTS_PER_SUBNET - 1; d++) {
                push({ ...addr, d }, this.seed.hashRange(1, 8, 'lat', formatAddress(addr), d), false);
            }
            // ...plus long-haul peering into the wider lattice.
            links.push(...this.longHaul(addr, seen));
        }

        return links;
    }

    /**
     * Gateway-to-gateway links. These are derived from the gateway's own
     * coordinate, so peering is stable and reciprocal-feeling, and because the
     * sector hop is drawn from an unbounded integer the frontier never closes.
     */
    private longHaul(addr: LatticeAddress, seen: Set<string>): LatticeLink[] {
        const out: LatticeLink[] = [];
        const key = formatAddress(addr);
        const count = this.seed.hashRange(2, 5, 'haul', key);

        for (let i = 0; i < count; i++) {
            // Roughly one long-haul link in eight leaves the sector entirely.
            const jumps = this.seed.hash('haul', key, i, 'sector') < 0.12;
            const target: LatticeAddress = jumps
                ? makeAddress(
                    addr.sector + this.seed.hashRange(1, 4096, 'haul', key, i, 'delta'),
                    10,
                    this.seed.hashRange(0, 255, 'haul', key, i, 'b'),
                    this.seed.hashRange(0, 255, 'haul', key, i, 'c'),
                    1
                  )
                : makeAddress(
                    addr.sector,
                    addr.a,
                    this.seed.hashRange(0, 255, 'haul', key, i, 'b'),
                    this.seed.hashRange(0, 255, 'haul', key, i, 'c'),
                    1
                  );

            const tkey = formatAddress(target);
            if (seen.has(tkey)) continue;
            seen.add(tkey);

            // Gateways are always live, so this always yields a node.
            out.push({
                node: this.deriveNode(target),
                latency: this.seed.hashRange(jumps ? 200 : 20, jumps ? 900 : 140, 'lat', key, 'h', i),
                external: true
            });
        }
        return out;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Resolution
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Resolves a coordinate string to its address. Hostnames are *not*
     * resolvable here by design: an address is universal, but a hostname is
     * something you have to discover by scanning. That asymmetry is what gives
     * net-scan a reason to exist.
     */
    public resolveAddress(input: string): LatticeAddress | undefined {
        return parseAddress(input);
    }

    /**
     * Materialises a bounded slice of the lattice around a coordinate, for
     * consumers that still want a NetworkTopology shape.
     */
    public slice(origin: LatticeAddress, radius: number): NetworkTopology {
        const nodes: LatticeNode[] = [];
        const edges: LatticeEdge[] = [];
        const visited = new Set<string>();
        let frontier: LatticeAddress[] = [origin];

        const originNode = this.nodeAt(origin) ?? this.deriveNode(origin);
        nodes.push(originNode);
        visited.add(formatAddress(origin));

        for (let depth = 0; depth < radius; depth++) {
            const next: LatticeAddress[] = [];
            for (const current of frontier) {
                const from = this.nodeAt(current) ?? this.deriveNode(current);
                for (const link of this.neighbors(current)) {
                    edges.push({ fromId: from.id, toId: link.node.id, latency: link.latency });
                    if (visited.has(link.node.ip)) continue;
                    visited.add(link.node.ip);
                    nodes.push(link.node);
                    const parsed = parseAddress(link.node.ip);
                    if (parsed) next.push(parsed);
                }
            }
            frontier = next;
            if (frontier.length === 0) break;
        }

        return { nodes, edges };
    }
}
