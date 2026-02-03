/**
 * WorldManager.ts - Interface Adapter
 * 
 * Coordinates the World Simulation systems.
 * 
 * Pillar: The Four-Fold Shield (Coordinator)
 */

import { Location, LocationType } from '../domain/entities/world/Location';
import { Device, DeviceType } from '../domain/entities/world/Device';
import { Connection } from '../domain/entities/world/Connection';
import { WorldEffectDispatcher } from '../domain/services/world/WorldEffectDispatcher';
import { FileSystemObserver } from '../domain/services/world/FileSystemObserver';
import { StateProjector } from '../domain/services/world/StateProjector';
import { FileSystemService } from '../domain/services/FileSystemService';
import { WorldGenerator } from '../domain/services/generation/WorldGenerator';
import { IWorldStateProvider } from '../domain/interfaces/IWorldStateProvider';
import { IWorldManager } from '../domain/interfaces/IWorldManager';

export class WorldManager implements IWorldStateProvider, IWorldManager {
    private locations = new Map<string, Location>();
    private devices = new Map<string, Device>();
    private connections = new Map<string, Connection>();
    
    private dispatcher: WorldEffectDispatcher;
    private observer: FileSystemObserver;
    private projector: StateProjector;
    private generator: WorldGenerator;

    constructor() {
        this.generator = new WorldGenerator();
        this.initializeWorld();
        
        this.dispatcher = new WorldEffectDispatcher(this.devices, this.locations);
        this.observer = new FileSystemObserver(this.dispatcher);
        this.projector = new StateProjector(Array.from(this.devices.values()));
    }

    private initializeWorld() {
        // Generate a station using the Procedural Engine
        const world = this.generator.generateStation('prime-station');
        
        world.locations.forEach(l => this.locations.set(l.id, l));
        world.devices.forEach(d => {
            // For now, map all devices to 'terminalator' host for local testing
            // In a real scenario, these would map to their specific hosts (node-alpha, etc.)
            // But checking /dev on localhost requires them to be here.
            
            // To test the "Network Map" aspect, we should keep them on remote hosts,
            // but for the immediate "app test", let's alias one specific device to localhost
            // so the user can verify it easily.
            if (d.name === 'airlock') {
                d.hostId = 'terminalator';
            }
            this.devices.set(d.id, d);
        });
        world.connections.forEach(c => this.connections.set(c.id, c));
    }

    /**
     * Registers a new host/service into the simulation.
     */
    public registerHost(hostname: string, service: FileSystemService): void {
        this.observer.observe(hostname, service);
        this.projector.project(hostname, service);
    }

    /**
     * Updates the simulation (periodic tick).
     */
    public tick(activeHosts: Map<string, FileSystemService>): void {
        activeHosts.forEach((service, hostname) => {
            this.projector.project(hostname, service);
        });
    }

    public getAllLocations(): Location[] {
        return Array.from(this.locations.values());
    }

    public getAllDevices(): Device[] {
        return Array.from(this.devices.values());
    }

    public getDeviceById(id: string): Device | undefined {
        return this.devices.get(id);
    }

    public getLocationById(id: string): Location | undefined {
        return this.locations.get(id);
    }
}
