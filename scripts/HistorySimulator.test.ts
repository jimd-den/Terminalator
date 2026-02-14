/**
 * HistorySimulator.test.ts
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Unit Tests for the History Simulator
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// @ts-ignore
import { expect, test, describe } from "bun:test";
import { HistorySimulator } from "../src/domain/services/world/generation/HistorySimulator";
import { WorldSeed } from "../src/domain/services/world/generation/WorldSeed";

describe("HistorySimulator", () => {
    test("should generate deterministic history from the same seed", () => {
        const seedStr = "NeoRetroSeed_456";
        const simulator = new HistorySimulator();
        
        const historyA = simulator.simulate(new WorldSeed(seedStr), seedStr);
        const historyB = simulator.simulate(new WorldSeed(seedStr), seedStr);

        expect(historyA).toEqual(historyB);
        expect(historyA.factions.length).toBeGreaterThanOrEqual(3);
        expect(historyA.conflicts.length).toBeGreaterThanOrEqual(2);
    });

    test("should produce different history for different seeds", () => {
        const simulator = new HistorySimulator();
        const historyA = simulator.simulate(new WorldSeed("SeedA"), "SeedA");
        const historyB = simulator.simulate(new WorldSeed("SeedB"), "SeedB");

        expect(historyA).not.toEqual(historyB);
    });

    test("should generate valid faction IDs and types", () => {
        const simulator = new HistorySimulator();
        const history = simulator.simulate(new WorldSeed("TestSeed"), "TestSeed");

        history.factions.forEach(faction => {
            expect(faction.id).toBeDefined();
            expect(faction.name).toBeDefined();
            expect(faction.type).toBeDefined();
            expect(faction.influence).toBeGreaterThanOrEqual(10);
            expect(faction.influence).toBeLessThanOrEqual(90);
        });
    });

    test("conflicts should involve existing factions", () => {
        const simulator = new HistorySimulator();
        const history = simulator.simulate(new WorldSeed("ConflictTest"), "ConflictTest");
        const factionIds = history.factions.map(f => f.id);

        history.conflicts.forEach(conflict => {
            expect(conflict.involvedFactions).toHaveLength(2);
            expect(factionIds).toContain(conflict.involvedFactions[0]);
            expect(factionIds).toContain(conflict.involvedFactions[1]);
        });
    });
});
