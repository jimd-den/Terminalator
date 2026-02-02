/**
 * FileSystemPopulator - Domain Service
 * 
 * Generates realistic "Infrastructure Haystacks"—massive log files, 
 * messy configurations, and flat-file databases.
 * 
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Storyteller's Code (Literate Documentation)
 * Pillar: Performance & Purity (O(n) generation)
 * 
 * Intent:
 * To provide the player with realistic data volumes that prove the 
 * terminal's surgical superiority over manual searching or slow GUIs.
 */

import { FileSystem } from '../entities/FileSystem';
import { FileSystemService } from './FileSystemService';

export class FileSystemPopulator {
    private fsService: FileSystemService;

    constructor(fs: FileSystem) {
        this.fsService = new FileSystemService(fs);
    }

    /**
     * Generates a massive Apache-style access log with an injected error.
     * 
     * @param path - Destination path for the log file.
     * @param lineCount - Total number of lines to generate.
     * @param targetId - The unique Request ID to hide in the log.
     * @param errorType - The error tag to use.
     */
    public populateAccessLog(path: string, lineCount: number, targetId: string, errorType: string): void {
        let content = "";
        const faultIndex = Math.floor(Math.random() * (lineCount - 100)) + 50;

        for (let i = 0; i < lineCount; i++) {
            const timestamp = new Date(Date.now() - (lineCount - i) * 1000).toISOString();

            if (i === faultIndex) {
                content += `[${timestamp}] 500 ERROR - /api/v1/checkout - ${errorType} - id=${targetId}\n`;
            } else {
                const latency = Math.floor(Math.random() * 200) + 10;
                content += `[${timestamp}] 200 OK - /api/v1/status - latency=${latency}ms - user_agent="Mozilla/5.0"\n`;
            }

            // Simple chunking every 500 lines to avoid massive string concatenations if needed
            // But for 5000 lines, simple += is usually fine in most JS engines.
        }

        this.fsService.writeFile(path, content);
    }

    /**
     * Generates a CAD (Computer Aided Dispatch) unit database.
     */
    public populateUnitDatabase(path: string, count: number): void {
        let content = "UNIT_ID,NAME,ZONE,STATUS,LAST_SYNC\n";
        const zones = ['ZONE_A', 'ZONE_B', 'ZONE_C', 'ZONE_D'];

        for (let i = 0; i < count; i++) {
            const id = `UNIT-${100 + i}`;
            const zone = zones[Math.floor(Math.random() * zones.length)];
            const status = Math.random() > 0.3 ? 'BUSY' : 'IDLE';
            content += `${id},Officer_${i},${zone},${status},${Date.now()}\n`;
        }

        this.fsService.writeFile(path, content);
    }

    /**
     * Generates a list of active incidents.
     */
    public populateIncidentLogs(path: string, count: number, targetIncidentId: string, targetZone: string): void {
        let content = "INCIDENT_ID,CODE,LOCATION,PRIORITY\n";

        for (let i = 0; i < count; i++) {
            const id = i === 1 ? targetIncidentId : `INC-${500 + i}`;
            const code = '10-31'; // Crime in Progress
            const zone = i === 1 ? targetZone : 'ZONE_X';
            const priority = Math.floor(Math.random() * 5) + 1;
            content += `${id},${code},${zone},${priority}\n`;
        }

        this.fsService.writeFile(path, content);
    }
}
