import { Location, LocationType } from '../../entities/world/Location';
import { Device, DeviceType } from '../../entities/world/Device';
import { Connection, ConnectionType } from '../../entities/world/Connection';
import { Organization } from '../../entities/world/Organization';

export interface GeneratedWorld {
    locations: Location[];
    devices: Device[];
    connections: Connection[];
}

export type WorldTheme = 'CORPORATE' | 'INDUSTRIAL' | 'RESEARCH' | 'MILITARY';

export class WorldGenerator {
    /**
     * Generates a station cluster owned by an Organization.
     */
    public generateStation(seed: string, owner?: Organization): GeneratedWorld {
        const theme = this.deriveTheme(owner);
        const locations: Location[] = [];
        const devices: Device[] = [];
        const connections: Connection[] = [];

        // Seeded RNG
        let seedValue = 0;
        for (let i = 0; i < seed.length; i++) seedValue += seed.charCodeAt(i);
        const random = () => {
            const x = Math.sin(seedValue++) * 10000;
            return x - Math.floor(x);
        };

        // 1. Core Hub
        const hubId = `loc_hub_${seed}`;
        const hub: Location = {
            id: hubId,
            name: this.getHubName(theme),
            type: LocationType.STATION,
            description: this.getHubDescription(theme),
            controllingHost: (owner && owner.name) ? `${owner.name.toLowerCase().replace(' ', '-')}-core` : `core-${Math.floor(random() * 99)}`,
            state: { lights: 'ON', alarm: 'OFF', owner: owner?.id }
        };
        locations.push(hub);

        // 2. Generate Topology (Star + Ring)
        const roomCount = 4 + Math.floor(random() * 4); // 4-8 rooms
        const roomTypes = this.getRoomTypes(theme);

        for (let i = 0; i < roomCount; i++) {
            const roomType = roomTypes[Math.floor(random() * roomTypes.length)];
            const locId = `loc_${i}_${seed}`;
            
            const loc: Location = {
                id: locId,
                name: `${roomType} ${i + 1}`,
                type: LocationType.ROOM,
                description: `A standard ${roomType}.`,
                controllingHost: (owner && owner.name) ? `${owner.name.toLowerCase().replace(' ', '-')}-node-${i}` : `node-${i}`,
                state: { status: 'OK', owner: owner?.id }
            };
            locations.push(loc);

            // Connection to Hub
            connections.push({
                id: `conn_hub_${i}_${seed}`,
                fromId: hub.id,
                toId: loc.id,
                type: ConnectionType.PHYSICAL,
                properties: { latency: 1 }
            });

            // Populate Devices
            const deviceCount = 1 + Math.floor(random() * 2); // 1-2 devices
            for (let j = 0; j < deviceCount; j++) {
                const devType = this.getDeviceTypeForRoom(roomType);
                const devName = `${devType.toLowerCase()}_${i}_${j}`;
                
                const device: Device = {
                    id: `dev_${i}_${j}_${seed}`,
                    name: devName,
                    type: this.mapDeviceType(devType),
                    path: `/dev/${devName}`,
                    locationId: loc.id,
                    hostId: loc.controllingHost!,
                    state: 'ACTIVE'
                };
                devices.push(device);
            }
        }

        return { locations, devices, connections };
    }

    private deriveTheme(owner?: Organization): WorldTheme {
        if (!owner) return 'CORPORATE';
        if (owner.type === 'GOVERNMENT') return 'MILITARY';
        if (owner.type === 'ACADEMIC') return 'RESEARCH';
        if (owner.type === 'SYNDICATE') return 'INDUSTRIAL';
        return 'CORPORATE';
    }

    private getHubName(theme: WorldTheme): string {
        switch (theme) {
            case 'CORPORATE': return 'Reception & Security';
            case 'INDUSTRIAL': return 'Foreman\'s Office';
            case 'RESEARCH': return 'Central Lab Hub';
            case 'MILITARY': return 'Command Deck';
        }
    }

    private getHubDescription(theme: WorldTheme): string {
        switch (theme) {
            case 'CORPORATE': return 'Polished marble floors and a strict security desk.';
            case 'INDUSTRIAL': return 'Smell of ozone and grinding gears.';
            case 'RESEARCH': return 'Whiteboards filled with equations and coffee cups.';
            case 'MILITARY': return 'Tactical displays and alert indicators.';
        }
    }

    private getRoomTypes(theme: WorldTheme): string[] {
        switch (theme) {
            case 'CORPORATE': return ['Office', 'Server Room', 'Meeting Room', 'Pantry'];
            case 'INDUSTRIAL': return ['Assembly Line', 'Furnace', 'Storage', 'Loading Dock'];
            case 'RESEARCH': return ['Lab', 'Quarantine', 'Archive', 'Clean Room'];
            case 'MILITARY': return ['Barracks', 'Armory', 'Brig', 'Comms'];
        }
    }

    private getDeviceTypeForRoom(roomType: string): string {
        if (roomType.includes('Server') || roomType.includes('Comms')) return 'TERMINAL';
        if (roomType.includes('Armory') || roomType.includes('Quarantine')) return 'LOCK';
        if (roomType.includes('Furnace') || roomType.includes('Lab')) return 'SENSOR';
        return 'TERMINAL';
    }

    private mapDeviceType(typeStr: string): DeviceType {
        if (typeStr === 'LOCK') return DeviceType.ACTUATOR;
        if (typeStr === 'SENSOR') return DeviceType.SENSOR;
        return DeviceType.TERMINAL;
    }
}