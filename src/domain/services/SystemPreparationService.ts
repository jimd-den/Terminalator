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
import { IWorldManager } from '../interfaces/IWorldManager';

import { FileSystemPopulator } from './FileSystemPopulator';

export class SystemPreparationService {
    constructor(private worldManager: IWorldManager) { }

    /**
     * Prepares a target system for mission objectives.
     * @param hostname - The hostname of the system to prepare.
     * @param missions - The list of missions targetting this system.
     */
    public prepareSystemForMissions(hostname: string, missions: Mission[]) {
        // Use WorldManager to get/provision the host
        // Cast to any to access getHostFileSystem if strictly typed to IWorldManager without it, 
        // but we updated IWorldManager interface recently.
        const service = (this.worldManager as any).getHostFileSystem(hostname) as FileSystemService;
        
        if (!service) return;
        const system = service.fileSystem;

        const populator = new FileSystemPopulator(system);
        const relevantMissions = missions.filter(m => m.targetSystem === hostname);

        relevantMissions.forEach(mission => {
            // -- Archetype-Specific Preparation --
            if (mission.type === 'log-analysis') {
                service.mkdirp('/var/log/httpd');
                service.mkdirp('/etc/httpd/conf.d');
                populator.populateAccessLog('/var/log/httpd/access.log', 2000, mission.objectiveTarget, 'DB_FAIL');
                service.writeFile('/etc/httpd/conf.d/proxy.conf', '# HTTP PROXY CONFIGURATION\n# Route all traffic to backends\n# BUG: Invalid route at 10.0.0.5');
            } else if (mission.type === 'dispatcher') {
                service.mkdirp('/var/db');
                populator.populateIncidentLogs('/var/db/incidents.csv', 10, mission.objectiveTarget, 'ZONE_B');
                populator.populateUnitDatabase('/var/db/units.csv', 15);
            } else {
                // -- Standard Payload Generation --
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
