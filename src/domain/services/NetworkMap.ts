/**
 * NetworkMap Service - Domain Layer
 * 
 * Manages the registry of remote systems (nodes).
 * Integrates with SystemGenerator to create systems on demand.
 */

import { FileSystem } from '../entities/FileSystem';
import { SystemGenerator } from './SystemGenerator';
import { Logger } from '../../infrastructure/telemetry/Logger';

export class NetworkMap {
    private systems: Map<string, FileSystem> = new Map();
    private systemGenerator: SystemGenerator;

    constructor() {
        this.systemGenerator = new SystemGenerator();
    }

    /**
     * Retrieves a system by hostname.
     * Generates it if it doesn't exist and corresponds to a known/valid host pattern.
     */
    getSystem(hostname: string): FileSystem | undefined {
        return Logger.trace('NetworkMap.getSystem', () => {
            // 1. Check cache
            if (this.systems.has(hostname)) {
                return this.systems.get(hostname);
            }

            // 2. Localhost
            if (hostname === 'localhost' || hostname === 'test') {
                // Should be handled by main FS, but we can register it?
                // Actually, main FS is injected into GameCommandExecutor.
                // We only manage REMOTE systems here.
                return undefined;
            }

            // 3. Generate on demand
            // We assume any hostname requested via SSH (that isn't local) is a valid target for generation
            // In a real game, we might validate against a list of "discovered" nodes.
            // For now, we generate generic corporate/military systems based on name inference or random.

            let faction = 'corporate';
            if (hostname.includes('mil') || hostname.includes('SEC') || hostname.includes('CMD')) faction = 'military';
            if (hostname.includes('research') || hostname.includes('LAB') || hostname.includes('BIO')) faction = 'research';

            const fs = this.systemGenerator.generate({
                difficulty: 1, // Dynamic difficulty later
                faction
            });

            // Override the generated hostname to match requested if we want consistency?
            // SystemGenerator generates a random hostname.
            // If we asked for "corp-svr-001", we expect "corp-svr-001".
            // If we access via IP? We don't have IPs yet.
            // Let's assume we map the requested hostname to the generated system.
            // And update the generated system's hostname file.
            fs.writeFile('/etc/hostname', hostname, 'w');

            this.systems.set(hostname, fs);
            return fs;
        }, { hostname });
    }

    registerSystem(hostname: string, fs: FileSystem) {
        this.systems.set(hostname, fs);
    }
}
