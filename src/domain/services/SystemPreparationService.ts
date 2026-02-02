/**
 * SystemPreparationService - Domain Service
 * 
 * Ensures that remote systems are correctly populated with data required for missions.
 * Also handles initial root filesystem generation.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 */

import { NetworkMap } from './NetworkMap';
import { FileSystemService } from './FileSystemService';
import { Mission } from '../entities/Mission';
import { FileSystem } from '../entities/FileSystem';
import { SystemGenerator } from './SystemGenerator';

export class SystemPreparationService {
    constructor(private networkMap: NetworkMap) { }

    /**
     * Prepares a target system for mission objectives.
     * @param hostname - The hostname of the system to prepare.
     * @param missions - The list of missions targetting this system.
     */
    public prepareSystemForMissions(hostname: string, missions: Mission[]) {
        const system = this.networkMap.getSystem(hostname);
        if (!system) return;

        const service = new FileSystemService(system);
        const relevantMissions = missions.filter(m => m.targetSystem === hostname);

        relevantMissions.forEach(mission => {
            const targetPath = `/home/admin/${mission.objectiveTarget}`;
            try {
                service.mkdirp('/home/admin');
                service.writeFile(
                    targetPath,
                    `[ SECURE DATA ]\nSYSTEM: ${hostname}\nPAYLOAD: ${mission.objectiveTarget}\nAUTHENTICATION: REQUIRED\n\n${mission.description}`,
                    'w',
                    1002, // admin
                    1002  // admin
                );
            } catch (e) {
                // Ignore if exists/fails
            }
        });
    }

    /**
     * Initializes the local root filesystem if it is empty.
     * @param fs - The local filesystem entity.
     */
    public initializeRootFileSystem(fs: FileSystem) {
        const fsService = new FileSystemService(fs);
        if (fs.root && fs.root.children.size === 0) {
            const generator = new SystemGenerator();
            generator.populate(fsService, { difficulty: 1 });
        }
    }
}
