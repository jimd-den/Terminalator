/**
 * MissionPopulator.ts - Domain Service
 * 
 * Ensures that the physical world state matches the mission context.
 * If a mission is about "sorting a file", this service ensures that file exists
 * with the correct content.
 * 
 * Pillar: The Balanced Scale (Separation of Concerns)
 */

import { Mission } from '../entities/Mission';
import { IWorldManager } from '../interfaces/IWorldManager';
import { FileSystemService } from './FileSystemService';

export class MissionPopulator {
    constructor(private worldManager: IWorldManager) {}

    public populateMissionObjectives(mission: Mission): void {
        const host = mission.targetSystem;
        const fsService = (this.worldManager as any).getHostFileSystem(host) as FileSystemService;
        
        if (!fsService) {
            console.warn(`[MissionPopulator] Warning: Target host ${host} not found for mission ${mission.id}`);
            return;
        }

        // Logic based on Mission Type
        // For now, we assume Knuthian missions (sorting/searching) target a specific file.
        // The path is usually implicitly /var/log/OBJECTIVE_TARGET or just OBJECTIVE_TARGET relative to something.
        
        // Let's standardize on /var/log/ for these data files for now.
        const targetPath = `/var/log/${mission.objectiveTarget}`;
        
        // Ensure directory exists
        fsService.mkdirp('/var/log');

        // Create the file content
        const searchTerm = mission.metadata?.searchTerm;

        // 1. Unsorted Data (for Sorting Mission)
        if (mission.description.includes('unsorted')) {
            const content = this.generateUnsortedData(mission.problemSize || 100, searchTerm);
            fsService.writeFile(targetPath, content);
        }
        // 2. Sorted Data (for Search Mission)
        else if (mission.description.includes('sorted')) {
            const content = this.generateSortedData(mission.problemSize || 1000, searchTerm);
            fsService.writeFile(targetPath, content);
        }
        // 3. Default
        else {
            const content = searchTerm ? `MISSION_CRITICAL_DATA: ${searchTerm}\n` : 'DATA_PAYLOAD_ENCRYPTED_...';
            fsService.writeFile(targetPath, content);
        }
    }

    private generateUnsortedData(size: number, searchTerm?: string): string {
        const lines = [];
        for (let i = 0; i < size; i++) {
            lines.push(`ID-${Math.floor(Math.random() * 99999)}: DATA-${i}`);
        }
        
        if (searchTerm) {
            // Inject search term at random position
            const pos = Math.floor(Math.random() * lines.length);
            lines[pos] = `ID-${searchTerm}: TARGET_RECORD_DATA`;
        }

        return lines.join('\n');
    }

    private generateSortedData(size: number, searchTerm?: string): string {
        const lines = [];
        for (let i = 0; i < size; i++) {
            // Simple padded ID for sortability
            const id = String(i).padStart(5, '0');
            lines.push(`ID-${id}: RECORD-${i}`);
        }

        if (searchTerm) {
            // For sorted data, we either replace a record or just append if we don't care about strict sort order in test
            // But search missions usually imply the data is sorted.
            // Let's replace a record in the middle to maintain 'sorted-ish' or just append and rely on user to find it.
            // Actually, if it's a Search mission, the term should be found.
            const pos = Math.floor(size / 2);
            lines[pos] = `ID-${searchTerm}: TARGET_RECORD_DATA`;
        }

        return lines.join('\n');
    }
}
