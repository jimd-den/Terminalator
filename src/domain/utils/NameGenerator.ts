/**
 * NameGenerator - Domain Utility
 * 
 * Pure functions for generating procedural names, hostnames, and filenames.
 * Used by SystemGenerator and MissionGenerator.
 * 
 * Pillar: The Swift Stream (Performance & Purity)
 */

const CORPORATE_PREFIXES = ['OMNI', 'CYBER', 'NEXUS', 'GLOBAL', 'DATA', 'TECH', 'SYNERGY', 'VORTEX'];
const CORPORATE_SUFFIXES = ['CORP', 'SYS', 'NET', 'DYNAMICS', 'LOGIC', 'WARE', 'SOFT', 'COM'];

const MILITARY_PREFIXES = ['SEC', 'CMD', 'TAC', 'STRAT', 'DEF', 'OPS', 'NAV', 'BASE'];
const MILITARY_SUFFIXES = ['HQ', 'OUTPOST', 'BUNKER', 'GRID', 'ALPHA', 'BRAVO', 'ZULU'];

const FILE_TYPES = ['conf', 'log', 'dat', 'bin', 'enc', 'bak'];
const FILE_NAMES = ['manifest', 'payload', 'access', 'security', 'users', 'passwords', 'protocol', 'schema'];

/**
 * Generates a random hostname based on faction/theme.
 * @param faction 'corporate' | 'military' | 'research'
 */
export function generateHostname(faction: string = 'corporate'): string {
    const prefixes = faction === 'military' ? MILITARY_PREFIXES : CORPORATE_PREFIXES;
    const suffixes = faction === 'military' ? MILITARY_SUFFIXES : CORPORATE_SUFFIXES;

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const num = Math.floor(Math.random() * 999);

    return `${prefix}-${suffix}-${num.toString().padStart(3, '0')}`;
}

/**
 * Generates a random filename for a mission objective.
 */
export function generateObjectiveFilename(): string {
    const name = FILE_NAMES[Math.floor(Math.random() * FILE_NAMES.length)];
    const ext = FILE_TYPES[Math.floor(Math.random() * FILE_TYPES.length)];
    return `${name}_${Date.now().toString().slice(-4)}.${ext}`;
}

/**
 * Generates a random username.
 */
export function generateUsername(): string {
    const adjectives = ['silent', 'ghost', 'shadow', 'neon', 'null', 'void', 'bit', 'byte'];
    const nouns = ['walker', 'runner', 'coder', 'surfer', 'drifter', 'phantom', 'operator'];

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    return `${adj}_${noun}`;
}
