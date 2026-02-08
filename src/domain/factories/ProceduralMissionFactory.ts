/**
 * ProceduralMissionFactory.ts - Domain Factory
 * 
 * Generates Missions based on the current World State.
 * 
 * Pillar: Pragmatic Design Pattern (Factory)
 */

import { Mission, MissionStep } from '../entities/Mission';
import { NPC } from '../entities/NPC';
import { Location } from '../entities/world/Location';
import { Device } from '../entities/world/Device';
import { IWorldStateProvider } from '../interfaces/IWorldStateProvider';

export class ProceduralMissionFactory {
    constructor(private worldState: IWorldStateProvider) {}

    /**
     * Creates a mission to fix a problem in a location.
     */
    public createRepairMission(npc: NPC, location: Location, device: Device): Mission {
        // Validation: Lens 7 - The Lens of the Inhabitant
        // Verify that the device path actually exists in the host's simulated filesystem.
        const fsService = this.worldState.getHostFileSystem(device.hostId);
        if (fsService) {
            const node = fsService.resolve(device.path, '/');
            if (!node) {
                throw new Error(`Inhabitant Error: Device ${device.name} claims path ${device.path} on host ${device.hostId}, but the path is not mapped in the InodeTable.`);
            }
        }

        const missionId = `P-REP-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        return {
            id: missionId,
            type: 'modify', // Using existing archetype for now
            targetSystem: device.hostId,
            targetUser: 'admin',
            objectiveTarget: device.path,
            description: `CONTRACT: The ${device.name} in ${location.name} is reporting an anomaly. Access ${device.hostId} and reset the hardware state to 'ACTIVE'.`,
            reward: '2000 Credits',
            status: 'pending',
            currentStep: MissionStep.PENDING,
            assignedBy: npc.id,
            assignerName: npc.name,
            chatHistory: [],
            constraints: {
                maxTimeMs: 60000, // 1 minute
                requiredComplexity: 'O(1)'
            }
        };
    }
}
