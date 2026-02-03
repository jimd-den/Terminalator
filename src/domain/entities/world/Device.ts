/**
 * Device.ts - Domain Entity
 * 
 * Represents a hardware interface mapped to the Unix filesystem.
 * Devices are the bridge between the digital and physical world.
 * 
 * Pillar: The Four-Fold Shield (Enterprise Logic)
 */

export enum DeviceType {
    ACTUATOR = 'ACTUATOR', // e.g. Door, Airlock, Vent
    SENSOR = 'SENSOR',     // e.g. Camera, Thermometer
    TERMINAL = 'TERMINAL', // e.g. User Interface
    UPLINK = 'UPLINK'      // e.g. SatLink, Radio
}

export interface Device {
    id: string;
    name: string;
    type: DeviceType;
    
    /**
     * The absolute path in the virtual filesystem (e.g. /dev/airlock_3).
     */
    path: string;
    
    /**
     * The ID of the Location this device is physically located in.
     */
    locationId: string;
    
    /**
     * The ID of the Host this device is attached to.
     */
    hostId: string;

    /**
     * Current hardware state.
     */
    state: 'OPEN' | 'CLOSED' | 'ACTIVE' | 'INACTIVE' | string;
}
