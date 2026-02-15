/**
 * WorldPatchService.ts
 *
 * Pillar: The Four-Fold Shield (Clean Architecture) - Domain Service
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Decouples the world mutation logic from mission types.
 * It consumes a SystemPreparationSpec and applies the changes to the targeted FileSystem.
 *
 * Design Pattern: Command / Specification
 * Why: To allow the Mission system to describe its environmental requirements 
 * without knowing how the FileSystem or Log Generator works.
 */

import { FileSystemService } from '../FileSystemService';
import { IWorldManager } from '../../interfaces/IWorldManager';
import { SystemPreparationSpec } from '../../entities/world/SystemPreparationSpec';
import { FileSystemPopulator } from '../FileSystemPopulator';
import { FileSystem } from '../../entities/FileSystem';
import { SystemGenerator } from '../SystemGenerator';

export class WorldPatchService {
    constructor(private worldManager: IWorldManager) { }

    /**
     * Applies a specification to a specific host.
     * 
     * @param spec - The specification of what to build/modify on the host.
     */
    public patch(spec: SystemPreparationSpec): void {
        const service = (this.worldManager as any).getHostFileSystem(spec.hostname) as FileSystemService;
        if (!service) return;

        const system = service.fileSystem;
        const populator = new FileSystemPopulator(system);

        // 1. Create required directories
        spec.requiredDirs.forEach(dir => {
            try {
                service.mkdirp(dir);
            } catch (e) {
                // Ignore if exists
            }
        });

        // 2. Populate files
        spec.files.forEach(file => {
            const content = file.rawContent || '';
            
            // Basic parameter substitution (e.g., {target} -> "Value")
            let finalContent = content;
            if (file.params) {
                Object.entries(file.params).forEach(([key, val]) => {
                    finalContent = finalContent.replace(new RegExp(`{${key}}`, 'g'), String(val));
                });
            }

            try {
                service.writeFile(
                    file.path, 
                    finalContent, 
                    'w', 
                    file.owner ? 1002 : undefined, 
                    file.owner ? 1002 : undefined
                );
                
                if (file.mode !== undefined) {
                    service.chmod(file.path, file.mode);
                }
            } catch (e) {
                // Log failure or ignore
            }
        });

        // 3. Populate logs
        spec.logs.forEach(log => {
            try {
                // Ensure directory for log exists
                const parts = log.path.split('/');
                parts.pop();
                service.mkdirp(parts.join('/'));
                
                if (log.type === 'INCIDENT') {
                    populator.populateIncidentLogs(log.path, log.lineCount, log.keyPhrase, 'ZONE_B');
                } else if (log.type === 'UNIT') {
                    populator.populateUnitDatabase(log.path, log.lineCount);
                } else {
                    // Default to ACCESS log
                    populator.populateAccessLog(log.path, log.lineCount, 'GENERIC_NOISE', log.keyPhrase);
                }
            } catch (e) {
                // Ignore
            }
        });
    }

    /**
     * Initializes the local root filesystem if it is empty.
     * This is used for the initial "Boot" of the user's primary workstation.
     */
    public initializeRootFileSystem(fs: FileSystem) {
        const fsService = new FileSystemService(fs);
        
        // Check if /bin/ls exists. If not, it's a "cold" system that needs basic tools.
        let needsPopulate = false;
        try {
            if (!fsService.resolve('/bin/ls')) {
                needsPopulate = true;
            }
        } catch (e) {
            needsPopulate = true;
        }

        if (needsPopulate) {
            const generator = new SystemGenerator();
            generator.populate(fsService, { difficulty: 1 });
        }
    }
}
