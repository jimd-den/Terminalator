/**
 * ArArchive - the common ar(1) archive format as written by GNU ar:
 *
 *   "!<arch>\n"
 *   per member a 60-byte header:
 *     name[16]  "name/" (System V / GNU), or "/N" = offset N in the "//" table
 *     date[12] uid[6] gid[6] mode[8 octal] size[10]  (decimal, space padded)
 *     "`\n"
 *   then the data, padded with "\n" to an even length.
 *
 * Names longer than 15 bytes go into a "//" member ("name/\n" records).
 * The reader also accepts BSD "#1/len" names and skips symbol tables
 * ("/" and "/SYM64/") and the "__.SYMDEF" member.
 */
import { concatBytes, fromLatin1, latin1, nameBytes, bytesName } from './ArchiveEntry';

export const AR_MAGIC = '!<arch>\n';

export class ArError extends Error { }

export interface ArMember {
    name: string;
    /** Seconds since the epoch. */
    date: number;
    uid: number;
    gid: number;
    /** st_mode (type and permission bits). */
    mode: number;
    data: Uint8Array;
}

export function isArchive(b: Uint8Array): boolean {
    return fromLatin1(b.subarray(0, 8)) === AR_MAGIC;
}

export function decodeAr(b: Uint8Array): ArMember[] {
    if (b.length === 0) return [];
    if (!isArchive(b)) throw new ArError('file format not recognized');
    const members: ArMember[] = [];
    let longNames = '';
    let off = 8;
    while (off + 60 <= b.length) {
        const h = fromLatin1(b.subarray(off, off + 60));
        if (h.slice(58, 60) !== '`\n') throw new ArError('malformed archive');
        const rawName = h.slice(0, 16).trimEnd();
        const num = (s: string, radix = 10) => parseInt(s.trim() || '0', radix) || 0;
        const size = num(h.slice(48, 58));
        let dataStart = off + 60;
        let data = b.slice(dataStart, dataStart + size);
        off = dataStart + size + (size & 1);
        if (rawName === '/' || rawName === '/SYM64/' || rawName === '__.SYMDEF' || rawName === '__.SYMDEF SORTED') continue;
        if (rawName === '//') { longNames = fromLatin1(data); continue; }
        let name: string;
        if (/^\/\d+$/.test(rawName)) {
            const start = parseInt(rawName.slice(1), 10);
            const end = longNames.indexOf('\n', start);
            name = longNames.slice(start, end < 0 ? undefined : end).replace(/\/$/, '');
        } else if (/^#1\/\d+$/.test(rawName)) {
            const len = parseInt(rawName.slice(3), 10);
            name = fromLatin1(data.subarray(0, len)).replace(/\0+$/, '');
            data = data.slice(len);
        } else {
            name = rawName.replace(/\/$/, '');
        }
        members.push({
            name: bytesName(latin1(name)),
            date: num(h.slice(16, 28)),
            uid: num(h.slice(28, 34)),
            gid: num(h.slice(34, 40)),
            mode: num(h.slice(40, 48), 8),
            data,
        });
    }
    return members;
}

function field(value: string | number, width: number): string {
    const s = String(value);
    if (s.length > width) throw new ArError('member header field too large');
    return s.padEnd(width, ' ');
}

function header(name: string, date: number, uid: number, gid: number, mode: string, size: number): Uint8Array {
    return latin1(field(name, 16) + field(date, 12) + field(uid, 6) + field(gid, 6) + field(mode, 8) + field(size, 10) + '`\n');
}

function padded(data: Uint8Array): Uint8Array {
    if (!(data.length & 1)) return data;
    const out = new Uint8Array(data.length + 1);
    out.set(data);
    out[data.length] = 0x0a;
    return out;
}

export function encodeAr(members: ArMember[]): Uint8Array {
    const parts: Uint8Array[] = [latin1(AR_MAGIC)];
    let table = '';
    const offsets = new Map<ArMember, number>();
    for (const m of members) {
        const bytes = fromLatin1(nameBytes(m.name));
        if (bytes.length > 15) {
            offsets.set(m, table.length);
            table += bytes + '/\n';
        }
    }
    if (table) {
        if (table.length & 1) table += '\n'; // GNU ar counts the padding in the table size
        const t = latin1(table);
        parts.push(latin1(field('//', 16) + ' '.repeat(32) + field(t.length, 10) + '`\n'), padded(t));
    }
    for (const m of members) {
        const name = offsets.has(m) ? `/${offsets.get(m)}` : fromLatin1(nameBytes(m.name)) + '/';
        parts.push(header(name, m.date, m.uid, m.gid, (m.mode & 0o177777).toString(8), m.data.length), padded(m.data));
    }
    return concatBytes(parts);
}
