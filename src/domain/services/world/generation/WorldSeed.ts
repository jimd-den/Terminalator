/**
 * WorldSeed.ts - Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Divine Spark (Deterministic PRNG)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Provides a deterministic source of randomness for the entire procedural
 * generation pipeline. Given the same seed string, this service must yield
 * the exact same sequence of numbers, ensuring that our universe is 
 * reproducible.
 * 
 * ALGORITHM: SplitMix32 (Fast, simple, good enough for game proc-gen).
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export class WorldSeed {
    private state: number;
    private readonly origin: string;

    constructor(seedString: string) {
        this.origin = seedString;
        this.state = this.cyrb128(seedString);
    }

    /**
     * The seed string this generator was born from.
     */
    public get seedString(): string {
        return this.origin;
    }

    /**
     * cyrb128 hash function to turn a string into a number state.
     */
    private cyrb128(str: string): number {
        let h1 = 1779033703, h2 = 3144134277,
            h3 = 1013904242, h4 = 2773480762;
        for (let i = 0, k; i < str.length; i++) {
            k = str.charCodeAt(i);
            h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
            h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
            h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
            h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
        }
        h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
        h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
        h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
        h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
        return (h1 ^ h2 ^ h3 ^ h4) >>> 0;
    }

    /**
     * Mulberry32 PRNG (Simple, fast 32-bit generator).
     */
    private mulberry32(): number {
        this.state += 0x6D2B79F5;
        let t = this.state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Returns a float between 0 (inclusive) and 1 (exclusive).
     */
    public next(): number {
        return this.mulberry32();
    }

    /**
     * Returns an integer between min (inclusive) and max (inclusive).
     */
    public range(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Picks a random element from an array.
     */
    public pick<T>(array: T[]): T {
        if (array.length === 0) throw new Error("Cannot pick from empty array");
        return array[this.range(0, array.length - 1)];
    }

    /**
     * Returns true with the given probability (0-1).
     */
    public chance(probability: number): boolean {
        return this.next() < probability;
    }

    /**
     * Derives an INDEPENDENT sub-seed for a coordinate in the world.
     *
     * This is the cornerstone of infinite generation: the returned WorldSeed
     * depends ONLY on this seed's origin string and the given parts -- never on
     * how many numbers have already been drawn from this instance. That purity
     * is what lets us derive node #4,000,000,000 without generating the first
     * 3,999,999,999, and lets us re-derive it identically forever after.
     *
     * Callers MUST use a derived seed (not the root) when generating content,
     * otherwise draw-order leaks in and determinism is lost.
     */
    public derive(...parts: (string | number)[]): WorldSeed {
        return new WorldSeed(`${this.origin}::${parts.join(':')}`);
    }

    /**
     * Pure scalar hash of a coordinate: same inputs, same float, always.
     * Does not disturb this generator's stream.
     */
    public hash(...parts: (string | number)[]): number {
        return this.derive(...parts).next();
    }

    /**
     * Pure integer in [min, max] for a coordinate. Stream-independent.
     */
    public hashRange(min: number, max: number, ...parts: (string | number)[]): number {
        return Math.floor(this.hash(...parts) * (max - min + 1)) + min;
    }

    /**
     * Pure element choice for a coordinate. Stream-independent.
     */
    public hashPick<T>(array: T[], ...parts: (string | number)[]): T {
        if (array.length === 0) throw new Error("Cannot pick from empty array");
        return array[this.hashRange(0, array.length - 1, ...parts)];
    }
}
