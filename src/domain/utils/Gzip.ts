/**
 * Gzip - the gzip file format (RFC 1952) around DEFLATE.
 *
 *   gzipEncode(data, { level, name, mtime })  -> one gzip member
 *   gzipDecode(bytes)                          -> all members, concatenated
 *
 * Header fields follow GNU gzip: FNAME when a name is given, MTIME in
 * seconds, XFL 2 for -9 / 4 for -1, OS 3 (Unix). Decoding verifies CRC-32
 * and ISIZE of every member and reports trailing garbage separately.
 */
import { crc32 } from './Crc32';
import { deflateRaw, inflateRaw } from './Deflate';

export class GzipError extends Error { }

const ID1 = 0x1f;
const ID2 = 0x8b;
const CM_DEFLATE = 8;
const FHCRC = 2, FEXTRA = 4, FNAME = 8, FCOMMENT = 16;

export function isGzip(data: Uint8Array): boolean {
    return data.length >= 2 && data[0] === ID1 && data[1] === ID2;
}

export interface GzipOptions {
    level?: number;
    /** Original file name (stored as FNAME, latin-1). */
    name?: string;
    /** Modification time in seconds since the epoch (0 = none). */
    mtime?: number;
}

export function gzipEncode(data: Uint8Array, opts: GzipOptions = {}): Uint8Array {
    const level = opts.level ?? 6;
    const name = opts.name !== undefined ? Uint8Array.from(opts.name, c => c.charCodeAt(0) & 0xff) : null;
    const mtime = Math.max(0, Math.floor(opts.mtime ?? 0)) >>> 0;
    const body = deflateRaw(data, level);
    const out = new Uint8Array(10 + (name ? name.length + 1 : 0) + body.length + 8);
    out.set([ID1, ID2, CM_DEFLATE, name ? FNAME : 0, mtime & 0xff, (mtime >>> 8) & 0xff, (mtime >>> 16) & 0xff, mtime >>> 24,
        level >= 9 ? 2 : level === 1 ? 4 : 0, 3]);
    let p = 10;
    if (name) { out.set(name, p); p += name.length + 1; }
    out.set(body, p);
    p += body.length;
    writeLe32(out, p, crc32(data));
    writeLe32(out, p + 4, data.length >>> 0);
    return out;
}

export interface GzipMember {
    name?: string;
    mtime: number;
    crc: number;
    size: number;
    /** Bytes of header and trailer (what gzip -l subtracts for the ratio). */
    overhead: number;
}

export interface GzipResult {
    data: Uint8Array;
    members: GzipMember[];
    /** Non-zero bytes after the last member that do not start another member. */
    trailingGarbage: boolean;
}

export function gzipDecode(src: Uint8Array): GzipResult {
    if (!isGzip(src)) throw new GzipError('not in gzip format');
    const parts: Uint8Array[] = [];
    const members: GzipMember[] = [];
    let pos = 0;
    let trailingGarbage = false;
    while (pos < src.length) {
        if (!isGzip(src.subarray(pos))) {
            trailingGarbage = src.subarray(pos).some(b => b !== 0);
            break;
        }
        const { member, data, end } = decodeMember(src, pos);
        parts.push(data);
        members.push(member);
        pos = end;
    }
    const total = parts.reduce((n, p) => n + p.length, 0);
    const data = new Uint8Array(total);
    let off = 0;
    for (const p of parts) { data.set(p, off); off += p.length; }
    return { data, members, trailingGarbage };
}

function decodeMember(src: Uint8Array, start: number): { member: GzipMember; data: Uint8Array; end: number } {
    if (src.length - start < 10) throw new GzipError('unexpected end of file');
    if (src[start + 2] !== CM_DEFLATE) throw new GzipError(`unknown method ${src[start + 2]} -- not supported`);
    const flags = src[start + 3];
    if (flags & 0xe0) throw new GzipError('has flags 0x' + flags.toString(16) + ' -- not supported');
    const mtime = readLe32(src, start + 4);
    let p = start + 10;
    if (flags & FEXTRA) {
        if (p + 2 > src.length) throw new GzipError('unexpected end of file');
        p += 2 + (src[p] | (src[p + 1] << 8));
    }
    let name: string | undefined;
    if (flags & FNAME) {
        const z = src.indexOf(0, p);
        if (z < 0) throw new GzipError('unexpected end of file');
        name = String.fromCharCode(...src.subarray(p, z));
        p = z + 1;
    }
    if (flags & FCOMMENT) {
        const z = src.indexOf(0, p);
        if (z < 0) throw new GzipError('unexpected end of file');
        p = z + 1;
    }
    if (flags & FHCRC) p += 2;
    const headerLen = p - start;
    let inflated;
    try {
        inflated = inflateRaw(src, p);
    } catch (e: any) {
        throw new GzipError(/end of file/.test(e?.message) ? 'unexpected end of file' : 'invalid compressed data--format violated');
    }
    const t = inflated.end;
    if (t + 8 > src.length) throw new GzipError('unexpected end of file');
    const crc = readLe32(src, t);
    const size = readLe32(src, t + 4);
    if (crc !== crc32(inflated.data)) throw new GzipError('invalid compressed data--crc error');
    if (size !== (inflated.data.length >>> 0)) throw new GzipError('invalid compressed data--length error');
    return { member: { name, mtime, crc, size, overhead: headerLen + 8 }, data: inflated.data, end: t + 8 };
}

function readLe32(b: Uint8Array, p: number): number {
    return (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0;
}

function writeLe32(b: Uint8Array, p: number, v: number): void {
    b[p] = v & 0xff; b[p + 1] = (v >>> 8) & 0xff; b[p + 2] = (v >>> 16) & 0xff; b[p + 3] = (v >>> 24) & 0xff;
}
