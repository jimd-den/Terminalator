import { FileSystem } from '../domain/entities/FileSystem';
import { FileSystemService } from '../domain/services/FileSystemService';
import { WorldGenerator } from '../domain/services/generation/WorldGenerator';
import { IWorldStateProvider } from '../domain/interfaces/IWorldStateProvider';
import { IWorldManager } from '../domain/interfaces/IWorldManager';
import { Location, LocationType } from '../domain/entities/world/Location';
import { Device, DeviceType } from '../domain/entities/world/Device';
import { WorldEffectDispatcher } from '../domain/services/world/WorldEffectDispatcher';
import { FileSystemObserver } from '../domain/services/world/FileSystemObserver';
import { StateProjector } from '../domain/services/world/StateProjector';
import { NetworkMap } from '../domain/services/NetworkMap';
import { IUniverseStrategy } from '../domain/interfaces/IUniverseStrategy';

/**
 * WorldManager - Interface Adapter
 * 
 * Manages the "Multiverse" of file systems.
 * Holds the local FS and generates/manages remote FS instances for generated worlds.
 */
export class WorldManager implements IWorldStateProvider, IWorldManager {
    private locations = new Map<string, Location>();
    private devices = new Map<string, Device>();
    
    // Map Hostname -> FileSystemService
    private hostFileSystems = new Map<string, FileSystemService>();
    
    private dispatcher: WorldEffectDispatcher;
    private observer: FileSystemObserver;
    private projector: StateProjector;
    private generator: WorldGenerator;
    private universe: IUniverseStrategy;

    constructor(
        private networkMap?: NetworkMap,
        private fsServiceProvider?: (fs: FileSystem) => FileSystemService
    ) {
        this.generator = new WorldGenerator();
        this.universe = this.generator.createUniverse('prime-station-seed');

        this.dispatcher = new WorldEffectDispatcher(this.devices, this.locations);
        this.observer = new FileSystemObserver(this.dispatcher);
        this.projector = new StateProjector(Array.from(this.devices.values()));
        
        // Register initial hosts from the universe
        this.universe.getInitialHosts().forEach(hostname => {
            this.getHostFileSystem(hostname);
        });
    }

    /**
     * Registers a host (Local or Remote) with the simulation loop.
     */
    public registerHost(hostname: string, service: FileSystemService): void {
        console.log(`[WorldManager] Registering host: ${hostname}. Has NetworkMap: ${!!this.networkMap}`);
        this.hostFileSystems.set(hostname, service);
        this.observer.observe(hostname, service);
        this.projector.project(hostname, service);
        
        // Synchronize with NetworkMap (Phase 10 integration)
        if (this.networkMap) {
            this.networkMap.registerSystem(hostname, service.fileSystem);
        }

        // --- Diegetic Projection (Lazy Entity Mapping) ---
        const locId = `loc_${hostname}`;
        if (!this.locations.has(locId)) {
            this.locations.set(locId, {
                id: locId,
                name: `${hostname.toUpperCase()} AREA`,
                type: LocationType.ROOM,
                description: `Procedurally mapped area for ${hostname}`,
                controllingHost: hostname,
                state: { owner: 'GENERIC' }
            });

            this.devices.set(`dev_${hostname}`, {
                id: `dev_${hostname}`,
                name: hostname,
                type: DeviceType.TERMINAL,
                path: `/dev/${hostname}`,
                locationId: locId,
                hostId: hostname,
                state: 'ACTIVE'
            });

            // Re-initialize projector to include new device
            this.projector = new StateProjector(Array.from(this.devices.values()));
        }
    }

    /**
     * Retrieves the FileSystem service for a given hostname.
     * Auto-provisions the host if it doesn't exist (Lazy Generation).
     */
    public getHostFileSystem(hostname: string): FileSystemService | null {
        if (!this.hostFileSystems.has(hostname)) {
            console.log(`[WorldManager] Lazy-Mounting Filesystem for: ${hostname}`);
            const fs = this.universe.mountFilesystem(hostname);
            
            // Resolve service via provider or fallback
            const service = this.fsServiceProvider 
                ? this.fsServiceProvider(fs)
                : new FileSystemService(fs);
            
            this.registerHost(hostname, service);
        }
        return this.hostFileSystems.get(hostname) || null;
    }

    public getAllHosts(): string[] {
        return Array.from(this.hostFileSystems.keys());
    }

    /**
     * Updates the simulation (periodic tick).
     */
    public tick(activeHosts: Map<string, FileSystemService>): void {
        activeHosts.forEach((service, hostname) => {
            this.projector.project(hostname, service);
        });
    }

    private generateAndRegisterWorld(seed: string, theme: any) {
        // Deprecated: Now handled lazily by the UniverseStrategy
    }

    // IWorldStateProvider Implementation
    public getAllLocations(): Location[] { return Array.from(this.locations.values()); }
    public getAllDevices(): Device[] { return Array.from(this.devices.values()); }
    public getDeviceById(id: string): Device | undefined { return this.devices.get(id); }
    public getLocationById(id: string): Location | undefined { return this.locations.get(id); }
}