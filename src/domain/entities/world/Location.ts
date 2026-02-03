/**
 * Location.ts - Domain Entity
 * 
 * Represents a physical or logical space in the game world.
 * Locations can be Rooms, Servers, or Stations.
 * 
 * Pillar: The Four-Fold Shield (Enterprise Logic)
 */

export enum LocationType {
    ROOM = 'ROOM',
    STATION = 'STATION',
    SERVER = 'SERVER',
    VIRTUAL = 'VIRTUAL'
}

export interface Location {
    id: string;
    name: string;
    type: LocationType;
    description: string;
    
    /**
     * The ID of the Unix Host that controls/observes this location.
     */
    controllingHost?: string;
    
    /**
     * Metadata for simulation (e.g., oxygen level, light status).
     */
    state: Record<string, any>;
}
