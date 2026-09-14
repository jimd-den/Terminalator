/**
 * FactionForge.ts - Domain Service
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Political Landscape, Without a Word List
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The old OrganizationGenerator picked from 7 prefixes x 6 suffixes -- 42 names
 * total, which a player exhausts in one sitting. A world that never ends needs
 * a naming scheme that never repeats itself into recognition.
 *
 * So names are *composed*, not chosen: an onset/nucleus/coda syllable grammar
 * builds the stem, and a form word plus an optional numeric designation trails
 * it. The combinatorial space runs to the billions, and because every draw is a
 * pure hash of the subnet coordinate, the faction at 10.4.7.x is the same
 * faction every time anyone looks.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { WorldSeed } from '../generation/WorldSeed';

export enum LatticeFactionType {
    MEGACORP = 'MEGACORP',
    GOVERNMENT = 'GOVERNMENT',
    DAO = 'DAO',
    SYNDICATE = 'SYNDICATE',
    ACADEMY = 'ACADEMY',
    REMNANT = 'REMNANT'
}

export interface LatticeFaction {
    id: string;
    name: string;
    slug: string;
    type: LatticeFactionType;
    techLevel: number;
    security: number;
    wealth: number;
}

const ONSET = ['b', 'br', 'd', 'dr', 'f', 'g', 'h', 'k', 'kr', 'l', 'm', 'n', 'p', 'pr', 'q', 'r', 's', 'st', 'sk', 't', 'tr', 'v', 'x', 'z', 'th', 'ch', 'ph', 'gl', 'kl', 'vr'];
const NUCLEUS = ['a', 'e', 'i', 'o', 'u', 'y', 'ae', 'ei', 'io', 'ou', 'ya', 'eo'];
// Interior syllables stay light so multi-syllable stems remain pronounceable;
// only the final syllable may take a heavy cluster.
const CODA_INNER = ['', '', '', 'n', 'r', 's', 'l', 'm'];
const CODA_FINAL = ['', 'n', 'r', 's', 'x', 'th', 'rk', 'nt', 'ss', 'lt', 'sk'];

const FORM: Record<LatticeFactionType, string[]> = {
    [LatticeFactionType.MEGACORP]: ['Corp', 'Industries', 'Holdings', 'Dynamics', 'Consolidated', 'Group', 'Systems'],
    [LatticeFactionType.GOVERNMENT]: ['Authority', 'Ministry', 'Directorate', 'Bureau', 'Commission', 'Council'],
    [LatticeFactionType.DAO]: ['Collective', 'Assembly', 'Commons', 'Mesh', 'Union', 'Guild'],
    [LatticeFactionType.SYNDICATE]: ['Syndicate', 'Cartel', 'Combine', 'Circle', 'Trust'],
    [LatticeFactionType.ACADEMY]: ['Institute', 'Academy', 'Laboratories', 'Foundation', 'Observatory'],
    [LatticeFactionType.REMNANT]: ['Remnant', 'Salvage', 'Estate', 'Archive', 'Wreck']
};

const TYPES = Object.values(LatticeFactionType);

export class FactionForge {
    /**
     * Derives the faction that owns a subnet. Pure in (seed, subnet).
     */
    public forge(seed: WorldSeed, subnet: string): LatticeFaction {
        const ns = ['faction', subnet];
        const type = seed.hashPick(TYPES, ...ns, 'type');
        const stem = this.buildStem(seed, subnet);
        const form = seed.hashPick(FORM[type], ...ns, 'form');

        // A minority of factions carry a numeric designation, which widens the
        // name space and makes sibling orgs feel like a real bureaucracy.
        const designated = seed.hash(...ns, 'designated') < 0.35;
        const designation = designated ? ` ${seed.hashRange(2, 99, ...ns, 'designation')}` : '';

        const name = `${stem} ${form}${designation}`;

        return {
            id: `fac_${subnet}`,
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            type,
            techLevel: seed.hashRange(1, 10, ...ns, 'tech'),
            security: seed.hashRange(1, 10, ...ns, 'sec'),
            wealth: seed.hashRange(10_000, 50_000_000, ...ns, 'wealth')
        };
    }

    /**
     * Two or three syllables of pronounceable nonsense, capitalised.
     */
    private buildStem(seed: WorldSeed, subnet: string): string {
        const syllables = seed.hashRange(2, 3, 'faction', subnet, 'syls');
        let stem = '';
        for (let i = 0; i < syllables; i++) {
            const last = i === syllables - 1;
            stem += seed.hashPick(ONSET, 'faction', subnet, 'on', i);
            stem += seed.hashPick(NUCLEUS, 'faction', subnet, 'nu', i);
            stem += seed.hashPick(last ? CODA_FINAL : CODA_INNER, 'faction', subnet, 'co', i);
        }
        return stem.charAt(0).toUpperCase() + stem.slice(1);
    }
}
