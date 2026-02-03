/**
 * Connection.ts - Domain Entity
 * 
 * Represents a link between two Locations.
 * Can be a physical Door or a Network Link.
 */

export enum ConnectionType {
    PHYSICAL = 'PHYSICAL',
    NETWORK = 'NETWORK'
}

export interface Connection {
    id: string;
    fromId: string;
    toId: string;
    type: ConnectionType;
    
    /**
     * If PHYSICAL, maps to a Device (e.g. Door).
     */
    deviceId?: string;
    
    /**
     * Simulation properties (e.g. Bandwidth, Latency).
     */
    properties: {
        bandwidth?: number; // bytes/sec
        latency?: number;   // ms
        locked?: boolean;
    };
}
