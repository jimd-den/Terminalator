/**
 * StateProjector.ts - Domain Service
 * 
 * Periodically projects World State back into the FileSystem as virtual files.
 * This enables "Diegetic Sensors" where the player can 'cat /dev/temp' to see state.
 * 
 * Pillar: The Balanced Scale (SRP)
 */

import { FileSystemService } from '../FileSystemService';
import { Device, DeviceType } from '../../entities/world/Device';

export class StateProjector {
    constructor(
        private devices: Device[]
    ) {}

    /**
     * Projects current device states into the provided FileSystemService.
     * Should be called periodically or on specific events.
     */
    public project(hostname: string, service: FileSystemService): void {
        const hostDevices = this.devices.filter(d => d.hostId === hostname);

        for (const device of hostDevices) {
            // For SENSORS, we update the file content with the current state.
            // ACTUATORS also show their state (e.g. 'cat /dev/airlock' -> 'OPEN').
            
            try {
                // Ensure parent directory exists
                const parentPath = device.path.substring(0, device.path.lastIndexOf('/')) || '/';
                service.mkdirp(parentPath, 0o755, 0, 0, '/');

                service.writeFile(
                    device.path,
                    device.state,
                    'w',
                    0, // root
                    0, // root
                    '/',
                    { uid: 0, gid: 0, groups: [0] } // acting as root
                );
            } catch (e: any) {
                console.error(`[StateProjector] Error projecting ${device.path}: ${e.message}`);
            }
        }
    }
}
