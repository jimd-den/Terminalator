/**
 * FileSystemHydrator.ts - Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Hydration Engine (Lattice -> FileSystem)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Converts abstract LatticeNodes into concrete FileSystem entities.
 * Fills /home, /var/log, /bin, and /etc with procedurally generated
 * artifacts and tools.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { WorldSeed } from './WorldSeed';
import { NetworkTopology, LatticeNode, NodeType } from '../../../entities/world/Lattice';
import { FileSystemService } from '../../FileSystemService';
import { ArtifactSynthesizer } from './ArtifactSynthesizer';
import { NPC } from '../../../entities/NPC';

export class FileSystemHydrator {
    private synthesizer: ArtifactSynthesizer = new ArtifactSynthesizer();

    /**
     * Hydrates a single node's file system.
     * 
     * @param seed WorldSeed
     * @param node The node to hydrate
     * @param fs The FileSystemService for this node
     * @param topology The whole topology (to find adjacent nodes for links)
     * @param npcs List of NPCs in the world
     */
    public hydrate(seed: WorldSeed, node: LatticeNode, fs: FileSystemService, topology: NetworkTopology, npcs: NPC[]): void {
        // 1. Basic Scaffolding
        fs.mkdirp('/bin');
        fs.mkdirp('/etc');
        fs.mkdirp('/var/log');
        fs.mkdirp('/home');
        fs.mkdirp('/tmp');

        // 2. System Artifacts
        fs.writeFile('/etc/hostname', node.hostname);
        fs.writeFile('/README.txt', this.synthesizer.generateReadme(seed, node));

        // 3. NPC Artifacts
        if (node.components.actorId) {
            const npc = npcs.find(n => n.id === node.components.actorId);
            if (npc) {
                const homeDir = `/home/${npc.name.toLowerCase()}`;
                fs.mkdirp(homeDir);
                
                // Add a "Hyperlink" artifact (email or log)
                // Pick a random adjacent node or a node from the same faction
                const factionNodes = topology.nodes.filter(n => n.factionId === node.factionId && n.id !== node.id);
                if (factionNodes.length > 0) {
                    const target = seed.pick(factionNodes);
                    fs.writeFile(`${homeDir}/inbox.mbox`, this.synthesizer.generateEmail(seed, "admin", target));
                }
            }
        }

        // 4. Server/Router Specifics
        if (node.type === NodeType.SERVER || node.type === NodeType.ROUTER) {
            const logCount = seed.range(1, 3);
            for (let i = 0; i < logCount; i++) {
                const target = seed.pick(topology.nodes.filter(n => n.id !== node.id));
                fs.writeFile(`/var/log/access_${i}.log`, this.synthesizer.generateLogEntry(seed, target));
            }
        }

        // 5. Vendor Specifics (The Black Market)
        if (node.components.isVendor && node.components.inventory) {
            fs.mkdirp('/public/tools');
            node.components.inventory.forEach(tool => {
                const content = `[ BINARY DATA: ${tool.toUpperCase()} ]
# This is a specialized tool used for ${tool.includes('pwn') ? 'exploitation' : 'analysis'}.
# Requires license key to execute.`;
                fs.writeFile(`/public/tools/${tool}`, content);
                // In a real scenario, we'd set permissions to 0o444 (read-only)
            });
        }
    }
}
