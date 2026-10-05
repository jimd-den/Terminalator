/**
 * Cpio - the cpio archive formats, byte-compatible with GNU cpio:
 *
 *   newc  "070701" + 13 eight-digit hex fields; name and data 4-byte aligned;
 *         hard-linked files carry their data only on the last link
 *   crc   "070702", as newc with a byte-sum checksum of the data
 *   odc   "070707" + octal fields (POSIX.1 cpio interchange format)
 *   bin   old binary: 13 little-endian shorts (magic 070707), 2-byte aligned
 *
 * Every archive ends with a "TRAILER!!!" member and is padded to 512 bytes.
 * (cpio -H ustar uses the Ustar codec.)
 */
import { ArchiveEntry, EntryKind, entryMode, kindFromMode, nameBytes, bytesName, fromLatin1, latin1, concatBytes } from './ArchiveEntry';

export type CpioFormat = 'newc' | 'crc' | 'odc' | 'bin';

export class CpioError extends Error { }

const TRAILER = 'TRAILER!!!';

function hex(v: number): string {
    return (v >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(-8);
}

function oct(v: number, width: number): string {
    const s = Math.max(0, Math.floor(v)).toString(8);
    return s.length > width ? s.slice(-width) : s.padStart(width, '0');
}

function pad(len: number, align: number): number {
    return (align - (len % align)) % align;
}

function payload(e: ArchiveEntry): Uint8Array {
    if (e.kind === 'symlink') return nameBytes(e.linkname);
    if (e.kind === 'file' || e.kind === 'hardlink') return e.data;
    return new Uint8Array(0);
}

function rdev(e: ArchiveEntry): number {
    return e.kind === 'char' || e.kind === 'block' ? (e.devmajor << 8) | e.devminor : 0;
}

function encodeOne(e: ArchiveEntry, format: CpioFormat): Uint8Array {
    const name = nameBytes(e.name);
    const data = payload(e);
    const mode = e.kind === 'hardlink' ? 0o100000 | (e.mode & 0o7777) : entryMode(e);
    const nlink = e.nlink ?? (e.kind === 'dir' ? 2 : 1);
    const ino = e.ino ?? 0;
    const dev = e.dev ?? 0;
    if (format === 'newc' || format === 'crc') {
        let check = 0;
        if (format === 'crc') for (const b of data) check = (check + b) >>> 0;
        const fields = [ino, mode, e.uid, e.gid, nlink, e.mtime, data.length, dev >> 8, dev & 0xff,
            e.kind === 'char' || e.kind === 'block' ? e.devmajor : 0, e.kind === 'char' || e.kind === 'block' ? e.devminor : 0,
            name.length + 1, check];
        const head = latin1((format === 'crc' ? '070702' : '070701') + fields.map(hex).join(''));
        const nameBlock = new Uint8Array(name.length + 1 + pad(110 + name.length + 1, 4));
        nameBlock.set(name);
        const dataBlock = new Uint8Array(data.length + pad(data.length, 4));
        dataBlock.set(data);
        return concatBytes([head, nameBlock, dataBlock]);
    }
    if (format === 'odc') {
        const head = latin1('070707' + oct(dev, 6) + oct(ino, 6) + oct(mode, 6) + oct(e.uid, 6) + oct(e.gid, 6) + oct(nlink, 6) +
            oct(rdev(e), 6) + oct(e.mtime, 11) + oct(name.length + 1, 6) + oct(data.length, 11));
        const nameBlock = new Uint8Array(name.length + 1);
        nameBlock.set(name);
        return concatBytes([head, nameBlock, data]);
    }
    // bin: little-endian shorts.
    const h = new Uint8Array(26);
    const shorts = [0o070707, dev & 0xffff, ino & 0xffff, mode & 0xffff, e.uid & 0xffff, e.gid & 0xffff, nlink & 0xffff, rdev(e) & 0xffff,
        (e.mtime >>> 16) & 0xffff, e.mtime & 0xffff, name.length + 1, (data.length >>> 16) & 0xffff, data.length & 0xffff];
    shorts.forEach((v, i) => { h[2 * i] = v & 0xff; h[2 * i + 1] = v >> 8; });
    const nameBlock = new Uint8Array(name.length + 1 + ((name.length + 1) & 1));
    nameBlock.set(name);
    const dataBlock = new Uint8Array(data.length + (data.length & 1));
    dataBlock.set(data);
    return concatBytes([h, nameBlock, dataBlock]);
}

/**
 * Encodes members plus the trailer, padded to 512 bytes. In newc/crc the
 * data of a hard-linked file goes with its last link only, as GNU cpio does.
 */
export function encodeCpio(entries: ArchiveEntry[], format: CpioFormat): Uint8Array {
    let list = entries;
    if (format === 'newc' || format === 'crc') {
        const lastOf = new Map<string, number>();
        entries.forEach((e, i) => { if ((e.nlink ?? 1) > 1 && (e.kind === 'file' || e.kind === 'hardlink')) lastOf.set(`${e.dev}:${e.ino}`, i); });
        list = entries.map((e, i) => {
            const key = `${e.dev}:${e.ino}`;
            if (!lastOf.has(key)) return e;
            const source = entries.find(x => `${x.dev}:${x.ino}` === key && x.kind === 'file') ?? e;
            return { ...e, kind: 'file' as EntryKind, data: lastOf.get(key) === i ? source.data : new Uint8Array(0) };
        });
    }
    const parts = list.map(e => encodeOne(e, format));
    parts.push(encodeOne({ name: TRAILER, kind: 'file', mode: 0, uid: 0, gid: 0, mtime: 0, data: new Uint8Array(0), linkname: '', devmajor: 0, devminor: 0, ino: 0, nlink: 1, dev: 0 }, format));
    const body = concatBytes(parts);
    return concatBytes([body, new Uint8Array(pad(body.length, 512))]);
}

export interface CpioReadResult {
    entries: ArchiveEntry[];
    format: CpioFormat | null;
    /** Bytes up to and including the trailer member. */
    end: number;
    error?: string;
}

export function detectCpio(b: Uint8Array, off = 0): CpioFormat | null {
    const magic = fromLatin1(b.subarray(off, off + 6));
    if (magic === '070701') return 'newc';
    if (magic === '070702') return 'crc';
    if (magic === '070707') return 'odc';
    if (b.length >= off + 2 && ((b[off] === 0xc7 && b[off + 1] === 0x71) || (b[off] === 0x71 && b[off + 1] === 0xc7))) return 'bin';
    return null;
}

/** Decodes an archive up to its trailer. Entries keep their header sizes and inode data. */
export function decodeCpio(b: Uint8Array): CpioReadResult {
    const entries: ArchiveEntry[] = [];
    let off = 0;
    let format: CpioFormat | null = null;
    for (;;) {
        if (off >= b.length) return { entries, format, end: off, error: 'premature end of archive' };
        const f = detectCpio(b, off);
        if (!f) return { entries, format, end: off, error: 'premature end of archive' };
        format ??= f;
        let mode: number, uid: number, gid: number, nlink: number, mtime: number, size: number, namesize: number, ino: number, dev: number, rmaj: number, rmin: number;
        let p: number;
        if (f === 'newc' || f === 'crc') {
            if (off + 110 > b.length) return { entries, format, end: off, error: 'premature end of archive' };
            const field = (i: number) => parseInt(fromLatin1(b.subarray(off + 6 + 8 * i, off + 14 + 8 * i)), 16) || 0;
            ino = field(0); mode = field(1); uid = field(2); gid = field(3); nlink = field(4); mtime = field(5); size = field(6);
            dev = (field(7) << 8) | field(8); rmaj = field(9); rmin = field(10); namesize = field(11);
            p = off + 110;
        } else if (f === 'odc') {
            if (off + 76 > b.length) return { entries, format, end: off, error: 'premature end of archive' };
            const field = (start: number, len: number) => parseInt(fromLatin1(b.subarray(off + start, off + start + len)), 8) || 0;
            dev = field(6, 6); ino = field(12, 6); mode = field(18, 6); uid = field(24, 6); gid = field(30, 6); nlink = field(36, 6);
            const rd = field(42, 6); rmaj = rd >> 8; rmin = rd & 0xff;
            mtime = field(48, 11); namesize = field(59, 6); size = field(65, 11);
            p = off + 76;
        } else {
            if (off + 26 > b.length) return { entries, format, end: off, error: 'premature end of archive' };
            const le = b[off] === 0xc7;
            const s = (i: number) => (le ? b[off + 2 * i] | (b[off + 2 * i + 1] << 8) : (b[off + 2 * i] << 8) | b[off + 2 * i + 1]);
            dev = s(1); ino = s(2); mode = s(3); uid = s(4); gid = s(5); nlink = s(6);
            rmaj = s(7) >> 8; rmin = s(7) & 0xff;
            mtime = s(8) * 65536 + s(9); namesize = s(10); size = s(11) * 65536 + s(12);
            p = off + 26;
        }
        if (p + namesize > b.length) return { entries, format, end: off, error: 'premature end of archive' };
        const rawName = b.subarray(p, p + namesize);
        const nul = rawName.indexOf(0);
        const name = bytesName(nul < 0 ? rawName : rawName.subarray(0, nul));
        p += namesize;
        if (f === 'newc' || f === 'crc') p += pad(110 + namesize, 4);
        else if (f === 'bin') p += namesize & 1;
        if (p + size > b.length) return { entries, format, end: off, error: 'premature end of archive' };
        const data = b.slice(p, p + size);
        p += size;
        if (f === 'newc' || f === 'crc') p += pad(size, 4);
        else if (f === 'bin') p += size & 1;
        off = p;
        if (name === TRAILER) return { entries, format, end: off };
        const kind = kindFromMode(mode) ?? 'file';
        entries.push({
            name, kind, mode: mode & 0o7777, uid, gid, mtime,
            data: kind === 'file' ? data : new Uint8Array(0),
            linkname: kind === 'symlink' ? bytesName(data) : '',
            devmajor: rmaj, devminor: rmin, ino, nlink, dev, size,
        });
    }
}

/**
 * Extraction order for hard links: within a group of members sharing an
 * inode, the member holding the data is created first and the others
 * become links to it (newc stores the data with the last link only).
 */
export function resolveLinks(entries: ArchiveEntry[]): ArchiveEntry[] {
    const groups = new Map<string, ArchiveEntry[]>();
    for (const e of entries) {
        if (e.kind !== 'file' || (e.nlink ?? 1) < 2) continue;
        const key = `${e.dev}:${e.ino}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(e);
    }
    const out: ArchiveEntry[] = [];
    const done = new Set<ArchiveEntry>();
    for (const e of entries) {
        if (done.has(e)) continue;
        const group = e.kind === 'file' && (e.nlink ?? 1) > 1 ? groups.get(`${e.dev}:${e.ino}`)! : null;
        if (!group || group.length < 2) { out.push(e); done.add(e); continue; }
        const holder = group.find(g => g.data.length > 0) ?? group[group.length - 1];
        // Emit the holder now, then the other members as links to it.
        out.push(holder);
        done.add(holder);
        for (const g of group) {
            if (g === holder || done.has(g)) continue;
            out.push({ ...g, kind: 'hardlink', linkname: holder.name, data: new Uint8Array(0) });
            done.add(g);
        }
    }
    return out;
}
