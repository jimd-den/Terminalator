/**
 * WorldGenerationPipeline.test.ts
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Integration Test for the Full World Generation Pipeline
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// @ts-ignore
import { expect, test, describe } from "bun:test";
import { WorldGenerator } from "../src/domain/services/generation/WorldGenerator";
import { FileSystem } from "../src/domain/entities/FileSystem";
import { FileSystemService } from "../src/domain/services/FileSystemService";
import { DirectoryNode } from "../src/domain/entities/filesystem/DirectoryNode";

describe("World Generation Pipeline", () => {
    test("should generate and hydrate a completable world", () => {
        const generator = new WorldGenerator();
        const seed = "FullPipelineTest";
        
        // 1. Generate
        const world = generator.generateWorld(seed);
        expect(world.topology.nodes.length).toBeGreaterThan(10);
        expect(world.npcs.length).toBeGreaterThan(0);

        // 2. Hydrate
        const fsMap = new Map<string, FileSystemService>();
        const getFs = (hostname: string) => {
            if (!fsMap.has(hostname)) {
                fsMap.set(hostname, new FileSystemService(new FileSystem()));
            }
            return fsMap.get(hostname)!;
        };

        generator.hydrateWorld(seed, world, getFs);

        // 3. Verify Artifacts
        const firstNode = world.topology.nodes[0];
        console.log(`First node: ${firstNode.hostname} (${firstNode.type})`);
        const fs = getFs(firstNode.hostname);
        
        // Check README
        expect(fs.readFile('/README.txt')).toContain(firstNode.hostname);

        // Check for Hyperlinks in logs or emails
        let foundHyperlink = false;
        fsMap.forEach((service, hostname) => {
            try {
                // Check common paths for artifacts
                const logEntries = (service.resolve('/var/log') as DirectoryNode)?.children || new Map();
                logEntries.forEach((node: any) => {
                    const content = service.readFile(`/var/log/${node.name}`);
                    if (content.includes('10.')) {
                        console.log(`Found hyperlink in ${hostname}:/var/log/${node.name}`);
                        foundHyperlink = true;
                    }
                });

                const homeDir = (service.resolve('/home') as DirectoryNode)?.children || new Map();
                homeDir.forEach((homeSub: any) => {
                    const homePath = `/home/${homeSub.name}`;
                    const files = (service.resolve(homePath) as DirectoryNode)?.children || new Map();
                    files.forEach((node: any) => {
                        const content = service.readFile(`${homePath}/${node.name}`);
                        if (content.includes('10.')) {
                            console.log(`Found hyperlink in ${hostname}:${homePath}/${node.name}`);
                            foundHyperlink = true;
                        }
                    });
                });
            } catch (e) {
                // console.error(`Error checking ${hostname}:`, e);
            }
        });

        expect(foundHyperlink).toBe(true);
    });
});
