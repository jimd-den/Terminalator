/**
 * WorldSeed.test.ts
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Unit Tests for the Deterministic PRNG
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// @ts-ignore
import { expect, test, describe } from "bun:test";
import { WorldSeed } from "../src/domain/services/world/generation/WorldSeed";

describe("WorldSeed", () => {
    test("should be deterministic for the same seed", () => {
        const seedA = new WorldSeed("NeoRetro123");
        const seedB = new WorldSeed("NeoRetro123");

        const seqA = [seedA.next(), seedA.next(), seedA.next()];
        const seqB = [seedB.next(), seedB.next(), seedB.next()];

        expect(seqA).toEqual(seqB);
    });

    test("should produce different sequences for different seeds", () => {
        const seedA = new WorldSeed("NeoRetro123");
        const seedB = new WorldSeed("Different456");

        const valA = seedA.next();
        const valB = seedB.next();

        expect(valA).not.toBe(valB);
    });

    test("range() should respect bounds", () => {
        const seed = new WorldSeed("BoundsTest");
        for (let i = 0; i < 100; i++) {
            const val = seed.range(10, 20);
            expect(val).toBeGreaterThanOrEqual(10);
            expect(val).toBeLessThanOrEqual(20);
            expect(Number.isInteger(val)).toBe(true);
        }
    });

    test("pick() should select from array", () => {
        const seed = new WorldSeed("PickTest");
        const items = ["apple", "banana", "cherry"];
        for (let i = 0; i < 10; i++) {
            const picked = seed.pick(items);
            expect(items).toContain(picked);
        }
    });

    test("chance() should roughly respect probability", () => {
        const seed = new WorldSeed("ChanceTest");
        let trueCount = 0;
        const total = 1000;
        const prob = 0.3;

        for (let i = 0; i < total; i++) {
            if (seed.chance(prob)) trueCount++;
        }

        // Allow some variance, but 300 should be close
        expect(trueCount).toBeGreaterThan(250);
        expect(trueCount).toBeLessThan(350);
    });
});
