/**
 * TopologyAndPopulation.test.ts
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Unit Tests for Topology and Population Generation
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// @ts-ignore
import { expect, test, describe } from "bun:test";
import { WorldSeed } from "../src/domain/services/world/generation/WorldSeed";
import { HistorySimulator } from "../src/domain/services/world/generation/HistorySimulator";
import { NetworkGraphGenerator } from "../src/domain/services/world/generation/NetworkGraphGenerator";
import { NPCPopulator } from "../src/domain/services/world/generation/NPCPopulator";
import { FactionType } from "../src/domain/entities/world/HistoryContext";
import { NodeType } from "../src/domain/entities/world/Lattice";

describe("Topology and Population", () => {
    const seedStr = "TopologyTest123";
    const seed = new WorldSeed(seedStr);
    const history = new HistorySimulator().simulate(new WorldSeed(seedStr), seedStr);

    test("should generate deterministic topology", () => {
        const generator = new NetworkGraphGenerator();
        const topologyA = generator.generate(new WorldSeed(seedStr), history);
        const topologyB = generator.generate(new WorldSeed(seedStr), history);

        expect(topologyA).toEqual(topologyB);
        expect(topologyA.nodes.length).toBeGreaterThan(0);
        expect(topologyA.edges.length).toBeGreaterThan(0);
    });

    test("should contain nodes for each faction", () => {
        const generator = new NetworkGraphGenerator();
        const topology = generator.generate(new WorldSeed(seedStr), history);
        
        const factionIds = history.factions.map(f => f.id);
        const nodeFactions = new Set(topology.nodes.map(n => n.factionId));

        factionIds.forEach(id => {
            expect(nodeFactions.has(id)).toBe(true);
        });
    });

    test("should assign vendor nodes with inventory", () => {
        const generator = new NetworkGraphGenerator();
        const topology = generator.generate(new WorldSeed(seedStr), history);
        
        const vendors = topology.nodes.filter(n => n.components.isVendor);
        expect(vendors.length).toBeGreaterThan(0);
        vendors.forEach(v => {
            expect(v.components.inventory).toBeDefined();
            expect(v.components.inventory!.length).toBeGreaterThan(0);
        });
    });

    test("NPCPopulator should assign actors to workstations", () => {
        const generator = new NetworkGraphGenerator();
        const populator = new NPCPopulator();
        
        const topology = generator.generate(new WorldSeed(seedStr), history);
        const npcs = populator.populate(new WorldSeed(seedStr), topology);

        const workstations = topology.nodes.filter(n => n.type === NodeType.WORKSTATION);
        workstations.forEach(ws => {
            expect(ws.components.actorId).toBeDefined();
            const npc = npcs.find(n => n.id === ws.components.actorId);
            expect(npc).toBeDefined();
            expect(npc!.faction).toBe(ws.factionId);
        });
    });
});
