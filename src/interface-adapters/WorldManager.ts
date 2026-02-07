import { FileSystem } from '../domain/entities/FileSystem';
import { FileSystemService } from '../domain/services/FileSystemService';
import { WorldGenerator } from '../domain/services/generation/WorldGenerator';
import { IWorldStateProvider } from '../domain/interfaces/IWorldStateProvider';
import { IWorldManager } from '../domain/interfaces/IWorldManager';
import { Location } from '../domain/entities/world/Location';
import { Device } from '../domain/entities/world/Device';
import { WorldEffectDispatcher } from '../domain/services/world/WorldEffectDispatcher';
import { FileSystemObserver } from '../domain/services/world/FileSystemObserver';
import { StateProjector } from '../domain/services/world/StateProjector';

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

    constructor() {
        this.generator = new WorldGenerator();
        this.dispatcher = new WorldEffectDispatcher(this.devices, this.locations);
        this.observer = new FileSystemObserver(this.dispatcher);
        this.projector = new StateProjector(Array.from(this.devices.values()));
        
        // Generate initial world
        this.generateAndRegisterWorld('prime-station', 'RESEARCH');
    }

    /**
     * Registers a host (Local or Remote) with the simulation loop.
     */
    public registerHost(hostname: string, service: FileSystemService): void {
        this.hostFileSystems.set(hostname, service);
        this.observer.observe(hostname, service);
        this.projector.project(hostname, service);
    }

    /**
     * Retrieves the FileSystem service for a given hostname.
     * Auto-provisions the host if it doesn't exist (Lazy Generation).
     */
    public getHostFileSystem(hostname: string): FileSystemService | null {
        if (!this.hostFileSystems.has(hostname)) {
            // Lazy Provisioning for Mission Targets
            const fs = new FileSystem();
            const service = new FileSystemService(fs);
            
            // Basic OS scaffolding
            service.mkdirp('/bin');
            service.mkdirp('/home/admin');
            service.mkdirp('/var/log');
            service.mkdirp('/dev');
            service.writeFile('/var/log/syslog', 'System initialized (Lazy Provision)...\n');

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
        const world = this.generator.generateStation(seed, theme);
        
        // 1. Store World Data
        world.locations.forEach(l => this.locations.set(l.id, l));
        world.devices.forEach(d => this.devices.set(d.id, d));
        
        // 2. Create FileSystems for new Hosts
        // Group devices by host
        const hosts = new Set(world.devices.map(d => d.hostId));
        
        hosts.forEach(hostname => {
            if (hostname === 'terminalator') return; // Don't overwrite local

            const fs = new FileSystem();
            const service = new FileSystemService(fs);
            
            // Basic OS scaffolding for remote host
            service.mkdirp('/bin');
            service.mkdirp('/home/admin');
            service.mkdirp('/var/log');
            service.mkdirp('/dev');
            service.writeFile('/var/log/syslog', 'System initialized...\n');

            this.registerHost(hostname, service);
        });

        // 3. Update Projector with new devices
        this.projector = new StateProjector(Array.from(this.devices.values()));
        
        // 4. Initial Projection
        hosts.forEach(h => {
            const fs = this.hostFileSystems.get(h);
            if (fs) this.projector.project(h, fs);
        });
    }

    // IWorldStateProvider Implementation
    public getAllLocations(): Location[] { return Array.from(this.locations.values()); }
    public getAllDevices(): Device[] { return Array.from(this.devices.values()); }
    public getDeviceById(id: string): Device | undefined { return this.devices.get(id); }
    public getLocationById(id: string): Location | undefined { return this.locations.get(id); }
}