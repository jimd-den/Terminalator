/**
 * InfiniteLattice.test.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Infinity Contract
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * These are acceptance tests, not unit tests: each one encodes a promise the
 * game makes to the player, phrased so that breaking the promise breaks the
 * build. "The world is infinite" is not directly testable, but its observable
 * consequences are, and those are what live here:
 *
 *   1. PURITY      — a coordinate's contents never depend on what else was asked.
 *   2. REPRODUCIBLE — the same seed rebuilds the same universe, exactly.
 *   3. DISTINCT    — different seeds are different worlds.
 *   4. UNBOUNDED   — no walk exhausts the reachable set.
 *   5. DISCOVERY   — scanning reveals hosts outside the starting set.
 *
 * Historically all five were false: node derivation advanced a shared PRNG, so
 * asking twice gave two answers, and every derived node collided on one id.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// @ts-ignore
import { expect, test, describe } from "bun:test";
import { WorldSeed } from "../src/domain/services/world/generation/WorldSeed";
import { InfiniteLattice } from "../src/domain/services/world/lattice/InfiniteLattice";
import { formatAddress, parseAddress } from "../src/domain/services/world/lattice/LatticeAddress";
import { WorldGenerator } from "../src/domain/services/generation/WorldGenerator";
import { NetworkMap } from "../src/domain/services/NetworkMap";

const lattice = (seed: string) => new InfiniteLattice(new WorldSeed(seed));

describe("Infinity Contract :: 1. Purity", () => {
    test("a coordinate derives identically no matter what else was queried", () => {
        const L = lattice("purity");
        const addr = L.home();

        const first = JSON.stringify(L.nodeAt(addr));
        // Deliberately churn the generator with thousands of unrelated queries.
        for (let i = 0; i < 500; i++) {
            L.nodeAt(parseAddress(`10.${i % 256}.${(i * 13) % 256}.${(i % 250) + 2}`)!);
        }
        expect(JSON.stringify(L.nodeAt(addr))).toBe(first);
    });

    test("repeated lookups of the same host agree (the original defect)", () => {
        const u = new WorldGenerator().createUniverse("regression");
        const host = u.deriveHome().hostname;
        const a = u.getNodeDetails(host);
        const b = u.getNodeDetails(host);
        expect(a).toEqual(b);
        expect(a!.components.cpuPower).toBe(b!.components.cpuPower);
    });

    test("derived nodes have distinct ids (no node_10_x_x_x collision)", () => {
        const L = lattice("ids");
        const ids = new Set<string>();
        let derived = 0;
        for (let i = 2; i < 200; i++) {
            const n = L.nodeAt(parseAddress(`10.9.9.${i}`)!) ?? L.nodeAt(parseAddress(`10.9.${i}.1`)!);
            if (!n) continue;
            ids.add(n.id);
            derived++;
        }
        expect(derived).toBeGreaterThan(20);
        expect(ids.size).toBe(derived);
    });
});

describe("Infinity Contract :: 2. Reproducibility", () => {
    test("the same seed rebuilds an identical universe", () => {
        const a = lattice("twin");
        const b = lattice("twin");
        const home = a.home();

        expect(formatAddress(b.home())).toBe(formatAddress(home));
        expect(b.nodeAt(home)).toEqual(a.nodeAt(home));
        expect(b.factionAt(home)).toEqual(a.factionAt(home));

        // Neighbourhoods too, latency included -- this is what the random LAT
        // column in net-scan used to violate.
        expect(a.neighbors(home)).toEqual(b.neighbors(home));
    });

    test("a far coordinate resolves without visiting anything in between", () => {
        const L = lattice("far");
        const far = parseAddress("77123:10.200.14.1")!;
        const node = L.nodeAt(far);
        expect(node).toBeDefined();
        expect(node!.ip).toBe("77123:10.200.14.1");
        expect(lattice("far").nodeAt(far)).toEqual(node);
    });
});

describe("Infinity Contract :: 3. Distinctness", () => {
    test("different seeds are different worlds", () => {
        const a = lattice("world-a");
        const b = lattice("world-b");
        const probe = parseAddress("10.5.5.1")!;
        expect(b.factionAt(probe).name).not.toBe(a.factionAt(probe).name);
    });

    test("faction names do not exhaust across many subnets", () => {
        const L = lattice("factions");
        const names = new Set<string>();
        for (let b = 0; b < 40; b++) {
            for (let c = 0; c < 10; c++) {
                names.add(L.factionAt(parseAddress(`10.${b}.${c}.1`)!).name);
            }
        }
        // The old generator capped at 42 names total.
        expect(names.size).toBeGreaterThan(300);
    });
});

describe("Infinity Contract :: 4. Unboundedness", () => {
    test("a long walk never exhausts the reachable set", () => {
        const L = lattice("walk");
        let cur = L.home();
        const seen = new Set<string>();
        const sectors = new Set<number>();

        for (let step = 0; step < 1200; step++) {
            const links = L.neighbors(cur);
            expect(links.length).toBeGreaterThan(0); // never a dead end
            links.forEach(l => seen.add(l.node.ip));
            const next = links[step % links.length];
            cur = parseAddress(next.node.ip)!;
            sectors.add(cur.sector);
        }

        expect(seen.size).toBeGreaterThan(1000);
        expect(sectors.size).toBeGreaterThan(1); // left the home sector
    });

    test("expansion reaches beyond the 32-bit quad via sectors", () => {
        const L = lattice("sectors");
        let frontier = [L.home()];
        let maxSector = 0;

        for (let depth = 0; depth < 6 && frontier.length; depth++) {
            const next: typeof frontier = [];
            for (const a of frontier.slice(0, 40)) {
                for (const l of L.neighbors(a)) {
                    const p = parseAddress(l.node.ip)!;
                    maxSector = Math.max(maxSector, p.sector);
                    next.push(p);
                }
            }
            frontier = next;
        }
        expect(maxSector).toBeGreaterThan(0);
    });
});

describe("Infinity Contract :: 5. Discovery", () => {
    test("scanning yields hosts outside the initial set", () => {
        const u = new WorldGenerator().createUniverse("discovery");
        const initial = new Set(u.getInitialHosts());
        const home = u.deriveHome();

        // Radius 2 crosses the gateway into the wider subnet.
        const found = u.expand(home.ip, 2);
        const novel = found.filter(d => !initial.has(d.node.hostname));

        expect(found.length).toBeGreaterThan(0);
        expect(novel.length).toBeGreaterThan(0);
    });

    test("NetworkMap reports hosts it was never booted with", () => {
        const u = new WorldGenerator().createUniverse("netmap");
        const map = new NetworkMap(u);

        const before = map.getAllHosts().length;
        map.discover(u.deriveHome().ip, 2);
        const after = map.getAllHosts().length;

        expect(after).toBeGreaterThan(before);
    });

    test("a host is mountable anywhere in the lattice by address", () => {
        const u = new WorldGenerator().createUniverse("mount");
        const map = new NetworkMap(u);
        const fs = map.getSystem("4242:10.11.12.1");
        expect(fs).toBeDefined();
    });

    test("an undiscovered hostname does not resolve, but its address does", () => {
        const u = new WorldGenerator().createUniverse("asymmetry");
        const map = new NetworkMap(u);
        expect(map.getSystem("definitely-not-a-real-host-9x")).toBeUndefined();
        expect(map.getSystem("10.3.4.1")).toBeDefined();
    });
});
