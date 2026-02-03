/**
 * NetworkGenerator - Domain Service
 * 
 * Assigns IP addresses and Hostnames to the world graph.
 * "The Nervous System" of the pipeline.
 * 
 * Pillar: The Balanced Scale (SRP)
 */

import { Location } from '../../entities/world/Location';

export class NetworkGenerator {
    /**
     * Assigns a subnet and IPs to locations.
     */
    public assignNetwork(locations: Location[], baseIp: string = '192.168.1'): void {
        locations.forEach((loc, index) => {
            if (!loc.controllingHost) {
                loc.controllingHost = `host-${index}`;
            }
            // Add network metadata to state
            loc.state['ip'] = `${baseIp}.${index + 10}`;
            loc.state['subnet'] = '255.255.255.0';
        });
    }
}
