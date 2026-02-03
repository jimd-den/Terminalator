/**
 * WorldGenerator.ts - Domain Service
 * 
 * Procedurally generates a graph of Locations, Devices, and Connections.
 * 
 * Pillar: Performance & Purity (Deterministic with Seed)
 */

import { Location, LocationType } from '../../entities/world/Location';
import { Device, DeviceType } from '../../entities/world/Device';
import { Connection, ConnectionType } from '../../entities/world/Connection';

export interface GeneratedWorld {
    locations: Location[];
    devices: Device[];
    connections: Connection[];
}

export class WorldGenerator {
    /**
     * Generates a station cluster.
     */
    public generateStation(seed: string): GeneratedWorld {
        const locations: Location[] = [];
        const devices: Device[] = [];
        const connections: Connection[] = [];

        // 1. Core Hub
        const hub: Location = {
            id: `loc_hub_${seed}`,
            name: 'Central Command',
            type: LocationType.STATION,
            description: 'The nerve center of the station.',
            controllingHost: 'core-01',
            state: { lights: 'ON' }
        };
        locations.push(hub);

        // 2. Peripheral Rooms (e.g. Server Rooms, Airlocks)
        const types = ['Server Room', 'Hydroponics', 'Airlock', 'Reactor'];
        
        for (let i = 0; i < types.length; i++) {
            const loc: Location = {
                id: `loc_${i}_${seed}`,
                name: `${types[i]} ${i + 1}`,
                type: LocationType.ROOM,
                description: `A functional ${types[i]}.`,
                controllingHost: i % 2 === 0 ? 'node-alpha' : 'node-beta',
                state: { status: 'OK' }
            };
            locations.push(loc);

            // Connection to Hub
            connections.push({
                id: `conn_${i}_${seed}`,
                fromId: hub.id,
                toId: loc.id,
                type: ConnectionType.PHYSICAL,
                properties: { latency: 1 }
            });

            // Add a Device to each room
            const device: Device = {
                id: `dev_${i}_${seed}`,
                name: types[i].toLowerCase().replace(' ', '_'),
                type: i === 2 ? DeviceType.ACTUATOR : DeviceType.SENSOR,
                path: `/dev/${types[i].toLowerCase().replace(' ', '_')}`,
                locationId: loc.id,
                hostId: loc.controllingHost!,
                state: 'ACTIVE'
            };
            devices.push(device);
        }

        return { locations, devices, connections };
    }
}
