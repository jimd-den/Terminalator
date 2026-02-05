/**
 * DiskMasteryRepository.ts
 * 
 * Implements IMasteryRepository using the simulated FileSystem.
 */

import { IMasteryRepository, MasteryData } from '../domain/interfaces/IMasteryRepository';
import { FileSystemService } from '../domain/services/FileSystemService';

export class DiskMasteryRepository implements IMasteryRepository {
    private readonly PATH = '/home/operator/.local/share/mastery.json';

    constructor(private fs: FileSystemService) {}

    async getMasteryData(): Promise<MasteryData> {
        try {
            const data = this.fs.readFile(this.PATH);
            return JSON.parse(data);
        } catch (e) {
            return {
                successCounts: {},
                failureCounts: {}
            };
        }
    }

    async saveMasteryData(data: MasteryData): Promise<void> {
        // Ensure directory exists
        const dir = '/home/operator/.local/share';
        try {
            this.fs.mkdirp(dir);
        } catch (e) {
            // Might already exist
        }

        const json = JSON.stringify(data);
        this.fs.writeFile(this.PATH, json, 'w');
    }
}
