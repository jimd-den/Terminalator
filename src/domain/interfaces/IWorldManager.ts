import { FileSystemService } from '../services/FileSystemService';

/**
 * IWorldManager.ts - Domain Interface
 * 
 * Defines the contract for the World Simulation Coordinator.
 * Allows the Domain Layer to interact with the World Simulation without
 * depending on the concrete Interface Adapter implementation.
 * 
 * Pillar: Dependency Inversion Principle (SOLID)
 */
export interface IWorldManager {
    /**
     * Registers a host's filesystem with the simulation loop.
     */
    registerHost(hostname: string, service: FileSystemService): void;

    /**
     * Retrieves the FileSystem service for a given hostname.
     */
    getHostFileSystem(hostname: string): FileSystemService | null;
}
