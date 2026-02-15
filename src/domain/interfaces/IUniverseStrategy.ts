import { LatticeNode } from '../entities/world/Lattice';
import { FileSystem } from '../entities/FileSystem';

/**
 * IUniverseStrategy - Domain Interface
 * 
 * Defines the behavior for lazy, deterministic world generation.
 * Instead of generating a billion nodes in memory, we ask the strategy 
 * to provide details for specific "coordinates" (Hostnames/IPs) as they are observed.
 */
export interface IUniverseStrategy {
    /**
     * Deterministically returns the details for a specific node without generating the whole graph.
     */
    getNodeDetails(hostname: string): LatticeNode | undefined;
    
    /**
     * Deterministically generates the filesystem ONLY when requested.
     */
    mountFilesystem(hostname: string): FileSystem;

    /**
     * Returns a list of "starting" hosts (e.g., the local gateway and immediate neighbors).
     */
    getInitialHosts(): string[];
}
