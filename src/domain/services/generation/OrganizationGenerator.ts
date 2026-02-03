/**
 * OrganizationGenerator.ts - Domain Service
 * 
 * Generates the political landscape: Corporations and Governments.
 * 
 * Pillar: The Storyteller's Code
 */

import { Organization, OrganizationType } from '../../entities/world/Organization';

export class OrganizationGenerator {
    private prefixes = ['Omni', 'Cyber', 'Nano', 'Terra', 'Solar', 'Lunar', 'Void'];
    private suffixes = ['Corp', 'Systems', 'Dynamics', 'Heavy Industries', 'Logistics', 'Gov'];

    public generateFaction(seed: string): Organization {
        const rng = this.createRNG(seed);
        const type = rng() > 0.5 ? OrganizationType.CORPORATION : OrganizationType.GOVERNMENT;

        return {
            id: `org_${seed}`,
            name: this.generateName(rng),
            type: type,
            techLevel: Math.floor(rng() * 10) + 1,
            wealth: Math.floor(rng() * 1000000),
            assets: [],
            relationships: {}
        };
    }

    private generateName(rng: () => number): string {
        const p = this.prefixes[Math.floor(rng() * this.prefixes.length)];
        const s = this.suffixes[Math.floor(rng() * this.suffixes.length)];
        return `${p}${s}`;
    }

    private createRNG(seed: string): () => number {
        let h = 0xdeadbeef;
        for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
        return function () {
            h = Math.imul(h ^ (h >>> 16), 2246822507);
            return ((h ^= h >>> 16) >>> 0) / 4294967296;
        };
    }
}
