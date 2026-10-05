/**
 * SCCS identification strings (SIDs): `R.L` on the trunk, `R.L.B.S` on a
 * branch. A partial SID (`R`, `R.L.B`) is accepted where a request may
 * name a release or a branch.
 */
export class Sid {
    constructor(
        readonly rel: number,
        readonly lev = 0,
        readonly br = 0,
        readonly seq = 0,
    ) { }

    /** Parses "R", "R.L", "R.L.B" or "R.L.B.S" (all components positive); null when invalid. */
    static parse(text: string): Sid | null {
        if (!/^[1-9][0-9]*(\.[1-9][0-9]*){0,3}$/.test(text)) return null;
        const p = text.split('.').map(n => parseInt(n, 10));
        if (p.some(n => n > 9999)) return null;
        return new Sid(p[0], p[1] ?? 0, p[2] ?? 0, p[3] ?? 0);
    }

    /** Number of components that are given (1..4). */
    get depth(): number {
        return this.seq ? 4 : this.br ? 3 : this.lev ? 2 : 1;
    }

    get isTrunk(): boolean {
        return this.br === 0;
    }

    equals(other: Sid): boolean {
        return this.rel === other.rel && this.lev === other.lev && this.br === other.br && this.seq === other.seq;
    }

    /** Ordering by components (trunk deltas sort before their branches). */
    compare(other: Sid): number {
        return this.rel - other.rel || this.lev - other.lev || this.br - other.br || this.seq - other.seq;
    }

    toString(): string {
        return [this.rel, this.lev, this.br, this.seq].slice(0, this.depth).join('.');
    }
}
