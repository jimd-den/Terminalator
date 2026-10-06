/**
 * SccsVersions - which delta a request names (get -r, prs -r, val -r) and
 * which SID a new delta receives (get -e), following the SCCS rules for
 * trunk successors, new releases and branches.
 */
import { SFile, Delta } from './SFile';
import { Sid } from './Sid';

export type Selection = { ok: true; delta: Delta } | { ok: false; error: string };

/**
 * Resolves a (possibly partial) SID request against the live deltas:
 *   none     the d flag's default SID, else the newest trunk delta
 *   R        the newest trunk delta of release R (or of the highest lower release)
 *   R.L      exactly that delta
 *   R.L.B    the newest delta on that branch
 *   R.L.B.S  exactly that delta
 */
export function selectDelta(file: SFile, request: Sid | null, cutoff?: string, key?: (d: Delta) => string): Selection {
    let live = file.live;
    if (cutoff && key) live = live.filter(d => key(d) <= cutoff);
    if (!live.length) return { ok: false, error: 'no deltas available' };
    const newest = (ds: Delta[]) => ds.reduce<Delta | undefined>((m, d) => (!m || d.sid.compare(m.sid) > 0 ? d : m), undefined);
    const trunk = live.filter(d => d.sid.isTrunk);
    if (!request) {
        const dflt = Sid.parse(file.flags.get('d') ?? '');
        if (dflt) return selectDelta(file, dflt, cutoff, key);
        const d = newest(trunk) ?? newest(live)!;
        return { ok: true, delta: d };
    }
    let found: Delta | undefined;
    switch (request.depth) {
        case 1: {
            found = newest(trunk.filter(d => d.sid.rel === request.rel));
            if (!found) {
                const lower = trunk.filter(d => d.sid.rel < request.rel);
                found = newest(lower);
            }
            break;
        }
        case 2:
        case 4:
            found = live.find(d => d.sid.equals(request));
            break;
        case 3:
            found = newest(live.filter(d => d.sid.rel === request.rel && d.sid.lev === request.lev && d.sid.br === request.br));
            break;
    }
    if (!found) return { ok: false, error: `Requested SID ${request} not found` };
    return { ok: true, delta: found };
}

/**
 * The SID for a new delta made from `got`. `reserved` are SIDs already
 * promised to pending edits (p-file); `branch` asks for a branch (get -b
 * with the b flag set).
 */
export function nextSid(file: SFile, got: Delta, request: Sid | null, branch: boolean, reserved: Sid[]): Sid {
    const taken = [...file.deltas.map(d => d.sid), ...reserved];
    const exists = (s: Sid) => taken.some(t => t.equals(s));
    const g = got.sid;
    if (request && request.depth === 1 && request.rel > g.rel && g.isTrunk) return new Sid(request.rel, 1);
    const newBranch = () => {
        const used = taken.filter(t => t.rel === g.rel && t.lev === g.lev && t.br > 0).map(t => t.br);
        return new Sid(g.rel, g.lev, Math.max(0, ...used) + 1, 1);
    };
    if (branch) return newBranch();
    if (g.isTrunk) {
        const later = taken.some(t => t.isTrunk && t.compare(g) > 0);
        return later ? newBranch() : new Sid(g.rel, g.lev + 1);
    }
    const next = new Sid(g.rel, g.lev, g.br, g.seq + 1);
    const later = taken.some(t => t.rel === g.rel && t.lev === g.lev && t.br === g.br && t.seq > g.seq);
    return later || exists(next) ? newBranch() : next;
}
