/**
 * SFile - the SCCS history file ("s-file") format shared by admin, get,
 * delta, prs, rmdel, val and friends. Every control line starts with SOH
 * (^A):
 *
 *   ^Ahsssss                        checksum: byte sum of the rest, mod 2^16
 *   ^As iiiii/ddddd/uuuuu           per delta, newest first: line statistics,
 *   ^Ad D 1.2 yy/mm/dd hh:mm:ss user serial pred
 *   ^Ai/^Ax/^Ag serials             included / excluded / ignored deltas
 *   ^Am mr, ^Ac comment             MR numbers and comment lines
 *   ^Ae
 *   ^Au  users...  ^AU              users allowed to make deltas
 *   ^Af flag [value]                header flags
 *   ^At  description...  ^AT        descriptive text
 *   body: text lines woven with ^AI n / ^AD n / ^AE n control records
 */
import { Sid } from './Sid';

export const SOH = '\x01';

export interface Delta {
    type: 'D' | 'R';
    sid: Sid;
    /** yy/mm/dd */
    date: string;
    /** hh:mm:ss */
    time: string;
    user: string;
    serial: number;
    pred: number;
    inserted: number;
    deleted: number;
    unchanged: number;
    included: number[];
    excluded: number[];
    ignored: number[];
    mrs: string[];
    comments: string[];
}

export class SFile {
    /** Deltas newest first, as stored. */
    deltas: Delta[] = [];
    users: string[] = [];
    flags = new Map<string, string>();
    description: string[] = [];
    /** Body lines (without newlines), control records included. */
    body: string[] = [];
    /** Whether the stored checksum matched the contents. */
    checksumOk = true;
    storedChecksum = 0;
    computedChecksum = 0;

    bySid(sid: Sid): Delta | undefined {
        return this.deltas.find(d => d.sid.equals(sid));
    }

    bySerial(serial: number): Delta | undefined {
        return this.deltas.find(d => d.serial === serial);
    }

    get maxSerial(): number {
        return this.deltas.reduce((m, d) => Math.max(m, d.serial), 0);
    }

    /** Deltas that have not been removed with rmdel. */
    get live(): Delta[] {
        return this.deltas.filter(d => d.type === 'D');
    }

    /** %M%: the m flag, else the g-file name. */
    moduleName(gname: string): string {
        return this.flags.get('m') || gname;
    }

    /**
     * The serial numbers whose changes make up `delta`: its ancestry, the
     * inclusions/exclusions recorded on those deltas, then the caller's
     * extra -i/-x lists. Ignored deltas are dropped.
     */
    appliedSet(delta: Delta, include: number[] = [], exclude: number[] = []): Set<number> {
        const set = new Set<number>();
        const excluded = new Set<number>(exclude);
        const ignored = new Set<number>();
        for (let d: Delta | undefined = delta; d; d = d.pred ? this.bySerial(d.pred) : undefined) {
            if (!excluded.has(d.serial)) set.add(d.serial);
            d.included.forEach(n => set.add(n));
            d.excluded.forEach(n => excluded.add(n));
            d.ignored.forEach(n => ignored.add(n));
        }
        include.forEach(n => set.add(n));
        excluded.forEach(n => { if (n !== delta.serial) set.delete(n); });
        ignored.forEach(n => set.delete(n));
        return set;
    }

    /** Serialises the file with a freshly computed checksum. */
    serialize(): string {
        const out: string[] = [];
        for (const d of this.deltas) {
            const pad = (n: number) => String(n).padStart(5, '0');
            out.push(`${SOH}s ${pad(d.inserted)}/${pad(d.deleted)}/${pad(d.unchanged)}`);
            out.push(`${SOH}d ${d.type} ${d.sid} ${d.date} ${d.time} ${d.user} ${d.serial} ${d.pred}`);
            if (d.included.length) out.push(`${SOH}i ${d.included.join(' ')}`);
            if (d.excluded.length) out.push(`${SOH}x ${d.excluded.join(' ')}`);
            if (d.ignored.length) out.push(`${SOH}g ${d.ignored.join(' ')}`);
            d.mrs.forEach(m => out.push(`${SOH}m ${m}`));
            d.comments.forEach(c => out.push(`${SOH}c ${c}`));
            out.push(`${SOH}e`);
        }
        out.push(`${SOH}u`, ...this.users, `${SOH}U`);
        for (const key of [...this.flags.keys()].sort()) {
            const value = this.flags.get(key)!;
            out.push(`${SOH}f ${key}${value !== '' ? ' ' + value : ''}`);
        }
        out.push(`${SOH}t`, ...this.description, `${SOH}T`);
        out.push(...this.body);
        const rest = out.join('\n') + '\n';
        return `${SOH}h${String(checksum(rest)).padStart(5, '0')}\n${rest}`;
    }
}

/** The SCCS checksum: sum of the bytes after the first line, modulo 65536. */
export function checksum(text: string): number {
    let sum = 0;
    for (const byte of new TextEncoder().encode(text)) sum = (sum + byte) & 0xffff;
    return sum;
}

export type ParseResult = { ok: true; file: SFile } | { ok: false; error: string; magic: boolean };

/** Parses s-file text; structural problems are reported as errors. */
export function parseSFile(text: string): ParseResult {
    const nl = text.indexOf('\n');
    const head = nl < 0 ? text : text.slice(0, nl);
    const hm = /^\x01h([0-9]{5})$/.exec(head);
    if (!hm) return { ok: false, error: 'No SCCS-file magic number', magic: false };
    const bad = (why: string): ParseResult => ({ ok: false, error: `corrupted SCCS file (${why})`, magic: true });
    const file = new SFile();
    const rest = nl < 0 ? '' : text.slice(nl + 1);
    file.storedChecksum = parseInt(hm[1], 10);
    file.computedChecksum = checksum(rest);
    file.checksumOk = file.storedChecksum === file.computedChecksum;

    const lines = rest.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    let i = 0;
    const at = (tag: string) => i < lines.length && (lines[i] === SOH + tag || lines[i].startsWith(SOH + tag + ' '));
    const arg = () => lines[i].slice(3);

    while (at('s')) {
        const s = /^\x01s ([0-9]+)\/([0-9]+)\/([0-9]+)$/.exec(lines[i++]);
        const d = /^\x01d ([DR]) ([0-9.]+) ([0-9]{2,4}\/[0-9]{2}\/[0-9]{2}) ([0-9]{2}:[0-9]{2}:[0-9]{2}) (\S+) ([0-9]+) ([0-9]+)$/.exec(lines[i++] ?? '');
        const sid = d ? Sid.parse(d[2]) : null;
        if (!s || !d || !sid || (sid.depth !== 2 && sid.depth !== 4)) return bad('delta table');
        const delta: Delta = {
            type: d[1] as 'D' | 'R', sid, date: d[3], time: d[4], user: d[5],
            serial: parseInt(d[6], 10), pred: parseInt(d[7], 10),
            inserted: parseInt(s[1], 10), deleted: parseInt(s[2], 10), unchanged: parseInt(s[3], 10),
            included: [], excluded: [], ignored: [], mrs: [], comments: [],
        };
        const nums = () => arg().trim().split(/\s+/).filter(Boolean).map(n => parseInt(n, 10));
        for (; i < lines.length && !at('e'); i++) {
            if (at('i')) delta.included.push(...nums());
            else if (at('x')) delta.excluded.push(...nums());
            else if (at('g')) delta.ignored.push(...nums());
            else if (at('m')) delta.mrs.push(arg());
            else if (at('c')) delta.comments.push(arg());
            else return bad('delta table');
        }
        if (!at('e')) return bad('delta table');
        i++;
        file.deltas.push(delta);
    }
    if (!at('u')) return bad('user list');
    for (i++; i < lines.length && !at('U'); i++) file.users.push(lines[i]);
    if (!at('U')) return bad('user list');
    i++;
    for (; at('f'); i++) {
        const m = /^\x01f (\S)(?: (.*))?$/.exec(lines[i]);
        if (!m) return bad('flags');
        file.flags.set(m[1], m[2] ?? '');
    }
    if (!at('t')) return bad('descriptive text');
    for (i++; i < lines.length && !at('T'); i++) file.description.push(lines[i]);
    if (!at('T')) return bad('descriptive text');
    i++;
    file.body = lines.slice(i);

    const open = new Set<number>();
    for (const line of file.body) {
        if (line[0] !== SOH) continue;
        const m = /^\x01([IDE]) ([0-9]+)$/.exec(line);
        if (!m) return bad('body');
        const n = parseInt(m[2], 10);
        if (m[1] === 'E') { if (!open.delete(n)) return bad('body'); }
        else open.add(n);
    }
    if (open.size) return bad('body');
    return { ok: true, file };
}
