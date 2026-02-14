/**
 * NetworkMap Service - Domain Layer
 * 
 * Manages the registry of remote systems (nodes).
 * Integrates with SystemGenerator to create systems on demand.
 */

import { FileSystem } from '../entities/FileSystem';
import { SystemGenerator } from './SystemGenerator';
import { FileSystemService } from './FileSystemService';

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
        // 1. Check cache
        if (this.systems.has(hostname)) {
            return this.systems.get(hostname);
        }

        // 2. Localhost
        if (hostname === 'localhost' || hostname === 'test') {
            return undefined;
        }

        // 3. Generate on demand
        let faction = 'corporate';
        if (hostname.includes('mil') || hostname.includes('SEC') || hostname.includes('CMD')) faction = 'military';
        if (hostname.includes('research') || hostname.includes('LAB') || hostname.includes('BIO')) faction = 'research';

        const fs = this.systemGenerator.generate({
            difficulty: 1, // Dynamic difficulty later
            faction
        });

        const service = new FileSystemService(fs);
        service.writeFile('/etc/hostname', hostname, 'w');

        this.systems.set(hostname, fs);
        return fs;
    }

    registerSystem(hostname: string, fs: FileSystem) {
        this.systems.set(hostname, fs);
    }

    public getAllHosts(): string[] {
        return Array.from(this.systems.keys());
    }
}
