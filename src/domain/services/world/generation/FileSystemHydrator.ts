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
import { SystemGenerator } from '../../SystemGenerator';
import { NPC } from '../../../entities/NPC';

export class FileSystemHydrator {
    private synthesizer: ArtifactSynthesizer = new ArtifactSynthesizer();
    private systemGenerator: SystemGenerator = new SystemGenerator();

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
        // 1. Populate full OS structure (Base OS + Binaries + Logs)
        this.systemGenerator.populate(fs, { difficulty: node.components.securityLevel || 1 });

        // 2. System Artifacts (Overrides or Adds specific ones)
        fs.writeFile('/etc/hostname', node.hostname);
        fs.writeFile('/README.txt', this.synthesizer.generateReadme(seed, node));

        // 3. NPC Artifacts
        if (node.components.actorId) {
            const npc = npcs.find(n => n.id === node.components.actorId);
            if (npc) {
                const homeDir = `/home/${npc.name.toLowerCase()}`;
                // SystemGenerator already created home dirs for 'user', 'guest', 'admin'.
                // We ensure this NPC has one too.
                fs.mkdirp(homeDir, 0o750);
                
                // Add a "Hyperlink" artifact (email or log)
                const factionNodes = topology.nodes.filter(n => n.factionId === node.factionId && n.id !== node.id);
                if (factionNodes.length > 0) {
                    const target = seed.pick(factionNodes);
                    fs.writeFile(`${homeDir}/inbox.mbox`, this.synthesizer.generateEmail(seed, "admin", target));
                }
            }
        }

        // 4. Server/Router Specifics (Extra logs)
        if (node.type === NodeType.SERVER || node.type === NodeType.ROUTER) {
            const logCount = seed.range(1, 3);
            for (let i = 0; i < logCount; i++) {
                const others = topology.nodes.filter(n => n.id !== node.id);
                if (others.length > 0) {
                    const target = seed.pick(others);
                    fs.writeFile(`/var/log/access_${i}.log`, this.synthesizer.generateLogEntry(seed, target));
                }
            }
        }

        // 5. Vendor Specifics (The Black Market)
        if (node.components.isVendor && node.components.inventory) {
            fs.mkdirp('/public/tools');
            node.components.inventory.forEach(tool => {
                const content = `[ BINARY DATA: ${tool.toUpperCase()} ]\n# This is a specialized tool used for bypass.\n# Requires license key to execute.`;
                fs.writeFile(`/public/tools/${tool}`, content);
            });
        }
    }
}
