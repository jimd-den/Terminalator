/**
 * Ustar - the POSIX ustar interchange format (XCU pax, "ustar Interchange
 * Format"), written the way GNU tar --format=ustar writes it:
 *
 *   offset size field          encoding
 *   0      100  name           NUL-padded
 *   100    8    mode           7 octal digits + NUL (permission bits only)
 *   108    8    uid, gid       7 octal digits + NUL
 *   124    12   size, mtime    11 octal digits + NUL
 *   148    8    chksum         6 octal digits + NUL + space
 *   156    1    typeflag       0 file, 1 link, 2 symlink, 3 chr, 4 blk, 5 dir, 6 fifo
 *   157    100  linkname
 *   257    6+2  "ustar\0" "00"
 *   265    32+32 uname, gname
 *   329    8+8  devmajor, devminor (devices only, else NUL)
 *   345    155  prefix         (long names are split at a '/')
 *
 * Archives end with two zero blocks and are padded to the record size
 * (20 blocks = 10240 bytes). The reader also accepts old v7 headers, GNU
 * long names (L/K) and pax extended headers (x/g).
 */
import { ArchiveEntry, EntryKind, concatBytes, nameBytes, bytesName, fromLatin1 } from './ArchiveEntry';

export const BLOCK = 512;
export const RECORD = 20 * BLOCK;

export class UstarError extends Error { }

const TYPEFLAG: Record<EntryKind, string> = { file: '0', hardlink: '1', symlink: '2', char: '3', block: '4', dir: '5', fifo: '6' };

function putString(h: Uint8Array, off: number, len: number, s: string | Uint8Array): void {
    const b = typeof s === 'string' ? nameBytes(s) : s;
    h.set(b.subarray(0, len), off);
}

function putOctal(h: Uint8Array, off: number, len: number, value: number): void {
    const digits = Math.max(0, Math.floor(value)).toString(8).padStart(len - 1, '0');
    if (digits.length > len - 1) throw new UstarError('value out of range');
    putString(h, off, len - 1, digits);
}

/** Splits a member name into ustar prefix and name, or null when impossible. */
export function splitName(full: string): { prefix: string; name: string } | null {
    const bytes = nameBytes(full);
    if (bytes.length <= 100) return { prefix: '', name: full };
    if (bytes.length > 256) return null;
    // The prefix is everything before some '/', at most 155 bytes; the rest at most 100.
    for (let i = Math.min(155, bytes.length - 1); i > 0; i--) {
        if (bytes[i] !== 0x2f) continue;
        if (bytes.length - i - 1 > 100 || bytes.length - i - 1 === 0) continue;
        return { prefix: bytesName(bytes.subarray(0, i)), name: bytesName(bytes.subarray(i + 1)) };
    }
    return null;
}

export function checksum(h: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < BLOCK; i++) sum += i >= 148 && i < 156 ? 0x20 : h[i];
    return sum;
}

/** The 512-byte header of an entry. Throws UstarError for names that cannot be stored. */
export function encodeHeader(e: ArchiveEntry): Uint8Array {
    const h = new Uint8Array(BLOCK);
    const stored = e.kind === 'dir' && !e.name.endsWith('/') ? e.name + '/' : e.name;
    const split = splitName(stored);
    if (!split) throw new UstarError('file name is too long (cannot be split); not dumped');
    if (nameBytes(e.linkname).length > 100) throw new UstarError('link name is too long; not dumped');
    putString(h, 0, 100, split.name);
    putOctal(h, 100, 8, e.mode & 0o7777);
    putOctal(h, 108, 8, e.uid);
    putOctal(h, 116, 8, e.gid);
    putOctal(h, 124, 12, e.kind === 'file' ? e.data.length : 0);
    putOctal(h, 136, 12, e.mtime);
    h[156] = TYPEFLAG[e.kind].charCodeAt(0);
    putString(h, 157, 100, e.linkname);
    putString(h, 257, 6, 'ustar');
    putString(h, 263, 2, '00');
    putString(h, 265, 32, e.uname ?? '');
    putString(h, 297, 32, e.gname ?? '');
    if (e.kind === 'char' || e.kind === 'block') {
        putOctal(h, 329, 8, e.devmajor);
        putOctal(h, 337, 8, e.devminor);
    }
    putString(h, 345, 155, split.prefix);
    const sum = checksum(h).toString(8).padStart(6, '0');
    putString(h, 148, 6, sum);
    h[154] = 0;
    h[155] = 0x20;
    return h;
}

/** Header plus data padded to whole blocks. */
export function encodeEntry(e: ArchiveEntry): Uint8Array {
    const header = encodeHeader(e);
    if (e.kind !== 'file' || e.data.length === 0) return header;
    const padded = new Uint8Array(Math.ceil(e.data.length / BLOCK) * BLOCK);
    padded.set(e.data);
    return concatBytes([header, padded]);
}

/** End-of-archive marker and record padding after `length` bytes of members. */
export function trailer(length: number, record = RECORD): Uint8Array {
    const withEnd = length + 2 * BLOCK;
    const total = Math.ceil(withEnd / record) * record;
    return new Uint8Array(total - length);
}

export function encodeArchive(entries: ArchiveEntry[]): Uint8Array {
    const parts = entries.map(encodeEntry);
    const len = parts.reduce((n, p) => n + p.length, 0);
    return concatBytes([...parts, trailer(len)]);
}

// ---------------------------------------------------------------- reading

function getString(h: Uint8Array, off: number, len: number): string {
    let end = off;
    while (end < off + len && h[end] !== 0) end++;
    return bytesName(h.subarray(off, end));
}

function getOctal(h: Uint8Array, off: number, len: number): number {
    if (h[off] & 0x80) {
        // GNU base-256 encoding for large values.
        let v = 0;
        for (let i = 1; i < len; i++) v = v * 256 + h[off + i];
        return v;
    }
    const s = fromLatin1(h.subarray(off, off + len)).replace(/[\0 ].*$/s, '').trim();
    return s ? parseInt(s, 8) || 0 : 0;
}

export function isZeroBlock(b: Uint8Array, off: number): boolean {
    for (let i = off; i < off + BLOCK; i++) if (b[i] !== 0) return false;
    return true;
}

/** True when the block at `off` is a valid tar header (checksum matches). */
export function isTarHeader(b: Uint8Array, off = 0): boolean {
    if (b.length < off + BLOCK || isZeroBlock(b, off)) return false;
    const stored = getOctal(b, off + 148, 8);
    const h = b.subarray(off, off + BLOCK);
    let signed = 0;
    for (let i = 0; i < BLOCK; i++) signed += i >= 148 && i < 156 ? 0x20 : (h[i] << 24) >> 24;
    return stored === checksum(h) || stored === signed;
}

export interface TarReadResult {
    entries: ArchiveEntry[];
    /** Offset where the end-of-archive marker starts (where -r appends). */
    end: number;
    /** Set when the archive is damaged after `entries`. */
    error?: string;
}

function parsePax(data: Uint8Array): Record<string, string> {
    const out: Record<string, string> = {};
    const text = bytesName(data);
    let p = 0;
    while (p < text.length) {
        const sp = text.indexOf(' ', p);
        if (sp < 0) break;
        const len = parseInt(text.slice(p, sp), 10);
        if (!(len > 0)) break;
        const rec = text.slice(sp + 1, p + len - 1);
        const eq = rec.indexOf('=');
        if (eq > 0) out[rec.slice(0, eq)] = rec.slice(eq + 1);
        p += len;
    }
    return out;
}

export function decodeArchive(b: Uint8Array): TarReadResult {
    const entries: ArchiveEntry[] = [];
    let off = 0;
    let longName: string | null = null;
    let longLink: string | null = null;
    let pax: Record<string, string> = {};
    let globalPax: Record<string, string> = {};
    while (off + BLOCK <= b.length) {
        if (isZeroBlock(b, off)) return { entries, end: off };
        if (!isTarHeader(b, off)) {
            return { entries, end: off, error: entries.length || off ? 'Skipping to next header' : 'This does not look like a tar archive' };
        }
        const h = b.subarray(off, off + BLOCK);
        const type = String.fromCharCode(h[156] || 0x30);
        const size = getOctal(h, 124, 12);
        const dataStart = off + BLOCK;
        const dataEnd = dataStart + size;
        if (dataEnd > b.length) return { entries, end: off, error: 'Unexpected EOF in archive' };
        const data = b.slice(dataStart, dataEnd);
        off = dataStart + Math.ceil(size / BLOCK) * BLOCK;

        if (type === 'L') { longName = getString(data, 0, data.length); continue; }
        if (type === 'K') { longLink = getString(data, 0, data.length); continue; }
        if (type === 'x') { pax = { ...pax, ...parsePax(data) }; continue; }
        if (type === 'g') { globalPax = { ...globalPax, ...parsePax(data) }; continue; }

        const isUstar = fromLatin1(h.subarray(257, 262)) === 'ustar';
        const prefix = isUstar && h[345] && fromLatin1(h.subarray(257, 263)) === 'ustar\0' ? getString(h, 345, 155) : '';
        const attrs = { ...globalPax, ...pax };
        let name = attrs.path ?? longName ?? (prefix ? `${prefix}/${getString(h, 0, 100)}` : getString(h, 0, 100));
        const linkname = attrs.linkpath ?? longLink ?? getString(h, 157, 100);
        let kind: EntryKind;
        switch (type) {
            case '1': kind = 'hardlink'; break;
            case '2': kind = 'symlink'; break;
            case '3': kind = 'char'; break;
            case '4': kind = 'block'; break;
            case '5': kind = 'dir'; break;
            case '6': kind = 'fifo'; break;
            default: kind = name.endsWith('/') ? 'dir' : 'file';
        }
        if (kind === 'dir') name = name.replace(/\/+$/, '') || '/';
        const num = (key: string, fallback: number) => (attrs[key] !== undefined ? Math.floor(parseFloat(attrs[key])) : fallback);
        entries.push({
            name,
            kind,
            mode: getOctal(h, 100, 8) & 0o7777,
            uid: num('uid', getOctal(h, 108, 8)),
            gid: num('gid', getOctal(h, 116, 8)),
            uname: attrs.uname ?? (isUstar ? getString(h, 265, 32) : ''),
            gname: attrs.gname ?? (isUstar ? getString(h, 297, 32) : ''),
            mtime: num('mtime', getOctal(h, 136, 12)),
            data: kind === 'file' ? data : new Uint8Array(0),
            linkname,
            devmajor: isUstar ? getOctal(h, 329, 8) : 0,
            devminor: isUstar ? getOctal(h, 337, 8) : 0,
            size: kind === 'file' ? data.length : 0,
        });
        longName = longLink = null;
        pax = {};
    }
    return { entries, end: off, error: off < b.length ? 'Unexpected EOF in archive' : undefined };
}
