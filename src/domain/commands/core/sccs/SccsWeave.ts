/**
 * SccsWeave - reading and writing the interleaved ("woven") body of an
 * s-file. Every version is present at once: text lines are bracketed by
 * ^AI n (inserted by delta n), ^AD n (deleted by delta n) and ^AE n (end of
 * n's block). Blocks are closed by serial, not necessarily innermost first.
 *
 * A line belongs to a version with applied serials S when every enclosing
 * insertion is in S and no enclosing deletion is.
 */
import { SOH } from './SFile';
import { diffLines, Hunk } from './LineDiff';

export interface Extracted {
    lines: string[];
    /** Serial of the delta that inserted each line. */
    serials: number[];
    /** Index of each line in the body. */
    positions: number[];
}

type Block = { kind: 'I' | 'D'; serial: number };

function control(line: string): Block & { end: boolean } | null {
    if (line[0] !== SOH) return null;
    const kind = line[1] as 'I' | 'D' | 'E';
    const serial = parseInt(line.slice(3), 10);
    return { kind: kind === 'E' ? 'I' : kind, serial, end: kind === 'E' };
}

/** Walks the body, calling `visit` for every text line with its visibility. */
function walk(body: string[], applied: Set<number>, visit: (index: number, visible: boolean, inserter: number) => void): void {
    const open: Block[] = [];
    let hidden = 0; // number of open blocks that hide text
    const hides = (b: Block) => (b.kind === 'I' ? !applied.has(b.serial) : applied.has(b.serial));
    for (let i = 0; i < body.length; i++) {
        const c = control(body[i]);
        if (!c) {
            let inserter = 0;
            for (let k = open.length - 1; k >= 0; k--) if (open[k].kind === 'I') { inserter = open[k].serial; break; }
            visit(i, hidden === 0, inserter);
            continue;
        }
        if (c.end) {
            for (let k = open.length - 1; k >= 0; k--) {
                if (open[k].serial === c.serial) {
                    if (hides(open[k])) hidden--;
                    open.splice(k, 1);
                    break;
                }
            }
        } else {
            const block = { kind: c.kind, serial: c.serial };
            open.push(block);
            if (hides(block)) hidden++;
        }
    }
}

/** The text of the version made of `applied` deltas. */
export function extract(body: string[], applied: Set<number>): Extracted {
    const out: Extracted = { lines: [], serials: [], positions: [] };
    walk(body, applied, (index, visible, inserter) => {
        if (!visible) return;
        out.lines.push(body[index]);
        out.serials.push(inserter);
        out.positions.push(index);
    });
    return out;
}

export interface DeltaResult {
    body: string[];
    inserted: number;
    deleted: number;
    unchanged: number;
    hunks: Hunk[];
    old: string[];
}

/**
 * Weaves `newLines` into the body as delta `serial`, relative to the
 * version made of `applied` deltas.
 */
export function addDelta(body: string[], applied: Set<number>, newLines: string[], serial: number): DeltaResult {
    const old = extract(body, applied);
    const hunks = diffLines(old.lines, newLines);
    const deleted = new Set<number>();
    const insertBefore = new Map<number, string[]>();
    let inserted = 0, removed = 0;
    for (const h of hunks) {
        for (let k = h.oldStart; k < h.oldEnd; k++) deleted.add(k);
        if (h.newEnd > h.newStart) insertBefore.set(h.oldEnd, newLines.slice(h.newStart, h.newEnd));
        inserted += h.newEnd - h.newStart;
        removed += h.oldEnd - h.oldStart;
    }
    const insertion = (lines: string[]) => [`${SOH}I ${serial}`, ...lines, `${SOH}E ${serial}`];

    const result: string[] = [];
    let next = 0; // next body index to copy
    const n = old.lines.length;
    for (let k = 0; k < n; k++) {
        const pos = old.positions[k];
        // A deletion run starting here; insertions belonging before it go first.
        if (deleted.has(k) && !deleted.has(k - 1)) {
            let end = k;
            while (deleted.has(end + 1)) end++;
            result.push(...body.slice(next, pos));
            result.push(`${SOH}D ${serial}`);
            result.push(...body.slice(pos, old.positions[end] + 1));
            result.push(`${SOH}E ${serial}`);
            next = old.positions[end] + 1;
            const after = insertBefore.get(end + 1);
            if (after) { result.push(...insertion(after)); insertBefore.delete(end + 1); }
            k = end;
            continue;
        }
        const before = insertBefore.get(k);
        if (before) {
            result.push(...body.slice(next, pos));
            next = pos;
            result.push(...insertion(before));
        }
    }
    const tail = insertBefore.get(n);
    if (tail) {
        const cut = n ? old.positions[n - 1] + 1 : body.length;
        if (cut >= next) { result.push(...body.slice(next, cut)); next = cut; }
        result.push(...insertion(tail));
    }
    result.push(...body.slice(next));
    return { body: result, inserted, deleted: removed, unchanged: n - removed, hunks, old: old.lines };
}

/** Removes every trace of delta `serial` (rmdel): its inserted lines and its control records. */
export function removeDelta(body: string[], serial: number): string[] {
    const result: string[] = [];
    let inside = false;
    for (const line of body) {
        const c = control(line);
        if (c && c.serial === serial) {
            if (!c.end && c.kind === 'I') inside = true;
            else if (c.end) inside = false;
            continue;
        }
        if (!inside) result.push(line);
    }
    return result;
}
