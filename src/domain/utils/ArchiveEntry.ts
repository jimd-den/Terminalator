/**
 * ArchiveEntry - the format-neutral member description shared by the
 * ustar, cpio and pax codecs (and the tar/cpio/pax utilities).
 */

export type EntryKind = 'file' | 'dir' | 'symlink' | 'hardlink' | 'char' | 'block' | 'fifo';

export interface ArchiveEntry {
    /** Member path as stored (directories without the trailing slash). */
    name: string;
    kind: EntryKind;
    /** Permission bits only (07777). */
    mode: number;
    uid: number;
    gid: number;
    uname?: string;
    gname?: string;
    /** Modification time, seconds since the epoch. */
    mtime: number;
    /** File contents (regular files; empty otherwise). */
    data: Uint8Array;
    /** Symlink target, or the member a hard link refers to. */
    linkname: string;
    devmajor: number;
    devminor: number;
    /** cpio bookkeeping: inode, link count and device of the source file. */
    ino?: number;
    nlink?: number;
    dev?: number;
    /**
     * Size recorded in the archive header when it differs from data.length
     * (cpio newc stores hard-link data only once; listings show the header size).
     */
    size?: number;
}

export const S_IFMT = 0o170000;
const TYPE_BITS: Record<EntryKind, number> = {
    file: 0o100000, hardlink: 0o100000, dir: 0o040000, symlink: 0o120000, char: 0o020000, block: 0o060000, fifo: 0o010000,
};

/** st_mode of an entry: type bits plus permissions. */
export function entryMode(e: ArchiveEntry): number {
    return TYPE_BITS[e.kind] | (e.mode & 0o7777);
}

/** The entry kind for st_mode type bits (sockets are not archived). */
export function kindFromMode(mode: number): EntryKind | null {
    switch (mode & S_IFMT) {
        case 0o100000: return 'file';
        case 0o040000: return 'dir';
        case 0o120000: return 'symlink';
        case 0o020000: return 'char';
        case 0o060000: return 'block';
        case 0o010000: return 'fifo';
        default: return null;
    }
}

/** Header size of an entry: what listings print. */
export function entrySize(e: ArchiveEntry): number {
    return e.size ?? e.data.length;
}

export function latin1(s: string): Uint8Array {
    return Uint8Array.from(s, c => c.charCodeAt(0) & 0xff);
}

export function fromLatin1(b: Uint8Array): string {
    let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return s;
}

/** UTF-8 encode/decode for member names (names travel as JS strings). */
export function nameBytes(s: string): Uint8Array {
    return new TextEncoder().encode(s);
}

export function bytesName(b: Uint8Array): string {
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(b);
    } catch {
        return fromLatin1(b);
    }
}

export function concatBytes(parts: Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let off = 0;
    for (const p of parts) { out.set(p, off); off += p.length; }
    return out;
}
