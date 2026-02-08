/**
 * SeedService - Domain Service
 * 
 * Generates deterministic seeds for world generation.
 * "The Chaos" step of the pipeline.
 * 
 * Pillar: The Swift Stream (Performance & Purity)
 */

export class SeedService {
    /**
     * Generates a random seed string.
     */
    public generateSeed(prefix: string = 'world'): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Creates a deterministic numeric generator from a string seed.
     */
    public createRNG(seed: string): () => number {
        let h = 0xdeadbeef;
        for (let i = 0; i < seed.length; i++) {
            h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
        }
        return function() {
            h = Math.imul(h ^ (h >>> 16), 2246822507);
            h = Math.imul(h ^ (h >>> 13), 3266489909);
            return ((h ^= h >>> 16) >>> 0) / 4294967296;
        };
    }
}
