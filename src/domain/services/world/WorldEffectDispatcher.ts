/**
 * WorldEffectDispatcher.ts - Domain Service
 * 
 * Maps filesystem writes to World State changes.
 * 
 * Example:
 * Path: /dev/airlock_1, Content: OPEN -> Update Location state or Device state.
 */

import { Device } from '../../entities/world/Device';
import { Location } from '../../entities/world/Location';

export class WorldEffectDispatcher {
    constructor(
        private devices: Map<string, Device>,
        private locations: Map<string, Location>
    ) {}

    /**
     * Dispatches an effect based on a filesystem write.
     */
    public dispatch(hostname: string, path: string, content: string): void {
        // 1. Find the device associated with this host and path
        const device = Array.from(this.devices.values()).find(d => d.hostId === hostname && d.path === path);
        
        if (!device) return;

        // 2. Simple state update (can be expanded with complex logic)
        const normalizedContent = content.trim().toUpperCase();
        device.state = normalizedContent;

        // 3. Propagate to Location if needed
        const location = this.locations.get(device.locationId);
        if (location) {
            location.state[device.name] = normalizedContent;
        }

        console.log(`[WorldEffect] Host: ${hostname}, Path: ${path} -> Device: ${device.name} is now ${normalizedContent}`);
    }
}
