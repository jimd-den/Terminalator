/**
 * LatticeAddress.ts - Domain Value Object
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Coordinate (Where "Infinite" Actually Lives)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * An address is the *only* input (besides the world seed) needed to derive a
 * node. There is no registry, no table, no pre-generated list -- if you can
 * write the coordinate, the node exists and is always the same node.
 *
 * Shape:  [sector:]A.B.C.D
 *
 *   A.B.C.D   an IPv4-style quad -- 2^32 nodes of "near space" per sector.
 *   sector    an unbounded non-negative integer. Sector 0 is home and is
 *             written without a prefix; every other sector is reached only by
 *             a long-haul link derived from a gateway, so the reachable space
 *             has no upper bound at all.
 *
 * The sector is what makes this genuinely unbounded rather than merely large:
 * a 32-bit quad alone would cap the universe at ~4.3 billion nodes.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface LatticeAddress {
    readonly sector: number;
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly d: number;
}

/** Nodes per subnet (the final octet). */
export const HOSTS_PER_SUBNET = 256;

const QUAD = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const SECTORED = /^(\d+):(.+)$/;

export function makeAddress(sector: number, a: number, b: number, c: number, d: number): LatticeAddress {
    return { sector, a, b, c, d };
}

/**
 * Canonical string form. Sector 0 renders as a bare quad so the common case
 * reads like an ordinary IP.
 */
export function formatAddress(addr: LatticeAddress): string {
    const quad = `${addr.a}.${addr.b}.${addr.c}.${addr.d}`;
    return addr.sector === 0 ? quad : `${addr.sector}:${quad}`;
}

/**
 * Parses a coordinate. Returns undefined for anything that is not a valid
 * address -- callers treat that as "this is a hostname, not a coordinate".
 */
export function parseAddress(input: string): LatticeAddress | undefined {
    let sector = 0;
    let quad = input.trim();

    const sectored = SECTORED.exec(quad);
    if (sectored) {
        sector = Number(sectored[1]);
        quad = sectored[2];
        if (!Number.isSafeInteger(sector) || sector < 0) return undefined;
    }

    const m = QUAD.exec(quad);
    if (!m) return undefined;

    const [a, b, c, d] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
    if ([a, b, c, d].some(n => n > 255)) return undefined;

    return { sector, a, b, c, d };
}

/** The subnet an address belongs to -- its first three octets. */
export function subnetOf(addr: LatticeAddress): string {
    return `${addr.sector}:${addr.a}.${addr.b}.${addr.c}`;
}

/** The gateway of an address's subnet always sits at host .1 */
export function gatewayOf(addr: LatticeAddress): LatticeAddress {
    return { ...addr, d: 1 };
}

export function isGateway(addr: LatticeAddress): boolean {
    return addr.d === 1;
}

export function addressEquals(x: LatticeAddress, y: LatticeAddress): boolean {
    return x.sector === y.sector && x.a === y.a && x.b === y.b && x.c === y.c && x.d === y.d;
}
