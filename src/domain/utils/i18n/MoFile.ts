/**
 * MoFile - GNU message catalogs (.mo), as written by msgfmt and read by
 * gettext.
 *
 *   magic 0x950412de, revision 0, N, offset of original table,
 *   offset of translation table, hash table size S, hash table offset,
 *   then N (length, offset) pairs for originals (sorted bytewise) and
 *   translations, the hash table (hashpjw, double hashing) and the
 *   NUL-terminated strings. Keys are "msgctxt\x04msgid"; plural
 *   msgids/msgstrs are NUL-separated.
 */

export const MO_MAGIC = 0x950412de;

export interface MoMessage {
    /** msgid, prefixed with "context\x04" and followed by "\0plural" when present. */
    key: Uint8Array;
    /** Translation(s), NUL-separated for plural forms. */
    value: Uint8Array;
}

const utf8 = new TextEncoder();
const utf8Decoder = new TextDecoder('utf-8');

/** Builds a key/value pair from strings (UTF-8). */
export function moMessage(msgid: string, msgstr: string[], msgctxt?: string, msgidPlural?: string): MoMessage {
    const key = (msgctxt !== undefined ? msgctxt + '\x04' : '') + msgid + (msgidPlural !== undefined ? '\0' + msgidPlural : '');
    return { key: utf8.encode(key), value: utf8.encode(msgstr.join('\0')) };
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return a.length - b.length;
}

/** gettext's hash_string (hashpjw) over the bytes up to the first NUL. */
export function hashString(bytes: Uint8Array): number {
    let hval = 0;
    for (const b of bytes) {
        if (b === 0) break;
        hval = ((hval << 4) + b) >>> 0;
        const g = hval & 0xf0000000;
        if (g !== 0) {
            hval = (hval ^ (g >>> 24)) >>> 0;
            hval = (hval ^ g) >>> 0;
        }
    }
    return hval >>> 0;
}

/** gettext's is_prime (hash.c): odd candidates only, and 3 does not count as prime. */
function isPrime(candidate: number): boolean {
    let divn = 3;
    let sq = divn * divn;
    while (sq < candidate && candidate % divn !== 0) {
        ++divn;
        sq += 4 * divn;
        ++divn;
    }
    return candidate % divn !== 0;
}

function nextPrime(n: number): number {
    let c = n | 1;
    while (!isPrime(c)) c += 2;
    return c;
}

/** Serialises messages into a .mo file (msgfmt). */
export function buildMo(messages: MoMessage[], withHash = true): Uint8Array {
    const msgs = [...messages].sort((a, b) => compareBytes(a.key, b.key));
    const n = msgs.length;
    const hashSize = withHash ? Math.max(3, nextPrime(Math.floor((n * 4) / 3))) : 0;
    const origOffset = 28;
    const transOffset = origOffset + n * 8;
    const hashOffset = transOffset + n * 8;
    let strOffset = hashOffset + hashSize * 4;
    const origTable: [number, number][] = [];
    const transTable: [number, number][] = [];
    for (const m of msgs) { origTable.push([m.key.length, strOffset]); strOffset += m.key.length + 1; }
    for (const m of msgs) { transTable.push([m.value.length, strOffset]); strOffset += m.value.length + 1; }

    const buf = new Uint8Array(strOffset);
    const dv = new DataView(buf.buffer);
    const u32 = (off: number, v: number) => dv.setUint32(off, v >>> 0, true);
    u32(0, MO_MAGIC); u32(4, 0); u32(8, n); u32(12, origOffset); u32(16, transOffset); u32(20, hashSize); u32(24, hashOffset);
    msgs.forEach((_, i) => {
        u32(origOffset + i * 8, origTable[i][0]); u32(origOffset + i * 8 + 4, origTable[i][1]);
        u32(transOffset + i * 8, transTable[i][0]); u32(transOffset + i * 8 + 4, transTable[i][1]);
    });
    if (hashSize) {
        const table = new Array<number>(hashSize).fill(0);
        msgs.forEach((m, i) => {
            const h = hashString(m.key);
            let idx = h % hashSize;
            const incr = 1 + (h % (hashSize - 2));
            while (table[idx] !== 0) idx = idx >= hashSize - incr ? idx - (hashSize - incr) : idx + incr;
            table[idx] = i + 1;
        });
        table.forEach((v, i) => u32(hashOffset + i * 4, v));
    }
    msgs.forEach((m, i) => {
        buf.set(m.key, origTable[i][1]);
        buf.set(m.value, transTable[i][1]);
    });
    return buf;
}

/** A loaded catalog: key -> translation (both decoded as UTF-8). */
export type MoCatalog = Map<string, string>;

/** Parses a .mo file (either byte order); null when it is not a catalog. */
export function parseMo(bytes: Uint8Array): MoCatalog | null {
    if (bytes.length < 28) return null;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let le = true;
    if (dv.getUint32(0, true) !== MO_MAGIC) {
        if (dv.getUint32(0, false) !== MO_MAGIC) return null;
        le = false;
    }
    const u32 = (off: number) => dv.getUint32(off, le);
    const n = u32(8), orig = u32(12), trans = u32(16);
    const str = (table: number, i: number): string | null => {
        const len = u32(table + i * 8), off = u32(table + i * 8 + 4);
        if (off + len > bytes.length) return null;
        return utf8Decoder.decode(bytes.subarray(off, off + len));
    };
    const out: MoCatalog = new Map();
    try {
        for (let i = 0; i < n; i++) {
            const k = str(orig, i), v = str(trans, i);
            if (k === null || v === null) return null;
            out.set(k.split('\0')[0], v);
        }
    } catch {
        return null;
    }
    return out;
}
