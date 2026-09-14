import { LatticeNode } from '../entities/world/Lattice';
import { FileSystem } from '../entities/FileSystem';

/**
 * A neighbouring node discovered by expanding from some origin.
 */
export interface DiscoveredNode {
    node: LatticeNode;
    /** Round-trip cost of the hop, derived -- never random. */
    latency: number;
    /** True when the hop leaves the origin's own subnet. */
    external: boolean;
}

/**
 * IUniverseStrategy - Domain Interface
 *
 * Defines the behaviour for lazy, deterministic world generation.
 * Instead of generating a billion nodes in memory, we ask the strategy
 * to provide details for specific "coordinates" as they are observed.
 *
 * Every method here must be PURE with respect to the world seed: calling
 * order must never change an answer. That is the whole contract that makes
 * an unbounded world reproducible.
 */
export interface IUniverseStrategy {
    /**
     * Deterministically returns the details for a node by hostname or address,
     * without generating the whole graph.
     */
    getNodeDetails(hostname: string): LatticeNode | undefined;

    /**
     * Deterministically generates the filesystem ONLY when requested.
     */
    mountFilesystem(hostname: string): FileSystem;

    /**
     * Derives the neighbours reachable from a node. This is the behaviour that
     * replaces a stored graph: there is always somewhere further to go, so
     * exploration is bounded by the player's patience rather than by generation.
     */
    expand(hostname: string, radius?: number): DiscoveredNode[];

    /**
     * The seed-derived starting node. Distinct seeds start in distinct places.
     */
    deriveHome(): LatticeNode;

    /**
     * Returns a list of "starting" hosts (the home node and its immediate
     * neighbours), derived from the seed rather than hardcoded.
     */
    getInitialHosts(): string[];

    /**
     * The seed string this universe was derived from -- for display and for
     * reproducing a world elsewhere.
     */
    getSeed(): string;
}
