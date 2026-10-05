/**
 * NlsCatalog - X/Open message catalogs (catopen/catgets), as compiled by
 * glibc's gencat.
 *
 * Source (XCU gencat): `$set n|NAME`, `$delset n|NAME`, `$quote c`,
 * `$ comment`, and messages `n text` or `NAME text` (glibc assigns symbolic
 * names the next free number). Text supports \n \t \v \b \r \f \\ \ddd
 * escapes, the quote character and line continuation.
 *
 * Binary (glibc): u32 magic 0x960408de, plane_size, plane_depth, then the
 * (set+1, msg, string offset) index in native (little-endian) and swapped
 * byte order, then the NUL-terminated strings. A message lives in slot
 * (set * msg) % plane_size of the first free depth level; the size is the
 * one minimising plane_size * plane_depth.
 *
 * All text is a byte string (one char per byte).
 */

export const CATGETS_MAGIC = 0x960408de;
const NL_SETD = 1;

interface Message { number: number; text: string; symbol: string | null; file: string | null; line: number }
interface MessageSet { number: number; messages: Message[]; symbol: string | null; file: string; line: number; deleted: boolean; lastMessage: number }

export class NlsCatalog {
    /** Sets, most recently created first (as glibc's list). */
    sets: MessageSet[] = [];
    private current: MessageSet;
    private lastSet = 0;
    private quote = '';
    totalMessages = 0;
    readonly errors: string[] = [];

    constructor() {
        this.current = this.findSet(NL_SETD);
    }

    /** find_set: sets are stored with number + 1 (0 marks a free slot). */
    private findSet(number: number): MessageSet {
        const n = number + 1;
        let set = this.sets.find(s => s.number === n);
        if (!set) {
            set = { number: n, messages: [], symbol: null, file: '', line: 0, deleted: false, lastMessage: 0 };
            this.sets.unshift(set);
        }
        return set;
    }

    private error(file: string, line: number, message: string) {
        this.errors.push(`${file}:${line}: ${message}`);
    }

    /** Reads one source file into the catalog. */
    read(source: string, file: string) {
        const raw = source.split('\n');
        if (raw.length && raw[raw.length - 1] === '') raw.pop();
        let lineNo = 0;
        while (lineNo < raw.length) {
            const start = lineNo + 1;
            let line = '';
            for (;;) {
                let piece = raw[lineNo++] ?? '';
                // An odd number of trailing backslashes continues the line.
                const m = /\\+$/.exec(piece);
                const continued = !!m && m[0].length % 2 === 1;
                if (continued) piece = piece.slice(0, -1);
                line += piece;
                if (!continued || lineNo >= raw.length) break;
            }
            this.readLine(line, file, start);
        }
    }

    private readLine(line: string, file: string, lineNo: number) {
        const isBlank = (c: string | undefined) => c === ' ' || c === '\t';
        const isSpace = (c: string | undefined) => c !== undefined && /[ \t\n\v\f\r]/.test(c);
        if (line[0] === '$') {
            if (isBlank(line[1])) return; // comment (or $ codeset=)
            if (line.startsWith('set', 1)) {
                let i = 4;
                while (isSpace(line[i])) i++;
                let number = 0;
                let symbol: string | null = null;
                if (/[0-9]/.test(line[i] ?? '')) {
                    number = parseInt(line.substring(i), 10);
                    if (number > this.lastSet) this.lastSet = number;
                } else {
                    const id = /^[A-Za-z0-9_]*/.exec(line.substring(i))![0];
                    if (!id) { this.error(file, lineNo, 'illegal set number'); return; }
                    const prev = this.sets.find(s => s.symbol === id);
                    if (prev) {
                        this.error(file, lineNo, 'duplicate set definition');
                        this.error(prev.file, prev.line, 'this is the first definition');
                        return;
                    }
                    symbol = id;
                    number = ++this.lastSet;
                }
                if (number !== 0) {
                    this.current = this.findSet(number);
                    this.current.symbol = symbol;
                    this.current.file = file;
                    this.current.line = lineNo;
                }
                return;
            }
            if (line.startsWith('delset', 1)) {
                let i = 7;
                while (isSpace(line[i])) i++;
                if (/[0-9]/.test(line[i] ?? '')) { this.findSet(parseInt(line.substring(i), 10)).deleted = true; return; }
                const id = /^[A-Za-z0-9_]*/.exec(line.substring(i))![0];
                if (!id) { this.error(file, lineNo, 'illegal set number'); return; }
                const set = this.sets.find(s => s.symbol === id);
                if (set) set.deleted = true;
                else this.error(file, lineNo, `unknown set \`${id}'`);
                return;
            }
            if (line.startsWith('quote', 1)) {
                let i = 6;
                while (isSpace(line[i])) i++;
                this.quote = line[i] ?? '';
                return;
            }
            const word = /^[^ \t\n\v\f\r]*/.exec(line.substring(1))![0];
            this.error(file, lineNo, `unknown directive \`${word}': line ignored`);
            return;
        }
        if (/^[A-Za-z0-9_]/.test(line)) {
            let i = 1;
            while (i < line.length && !isSpace(line[i])) i++;
            const ident = line.substring(0, i);
            const text = i < line.length ? line.substring(i + 1) : '';
            const set = this.current;
            let number: number;
            let symbol: string | null = null;
            if (/^[0-9]/.test(ident)) {
                number = parseInt(ident, 10);
                const idx = set.messages.findIndex(m => m.number === number);
                if (idx !== -1) {
                    const existing = set.messages[idx];
                    if (existing.symbol === null) {
                        this.error(file, lineNo, 'duplicated message number');
                        this.error(existing.file ?? '', existing.line, 'this is the first definition');
                        number = 0;
                    } else {
                        // Renumber the automatically numbered symbolic message.
                        existing.number = ++set.lastMessage;
                        set.messages.splice(idx, 1);
                        set.messages.push(existing);
                    }
                }
                if (number !== 0 && number > set.lastMessage) set.lastMessage = number;
            } else {
                const prev = set.messages.find(m => m.symbol === ident);
                if (prev) {
                    this.error(file, lineNo, 'duplicated message identifier');
                    this.error(prev.file ?? '', prev.line, 'this is the first definition');
                    number = 0;
                } else {
                    number = ++set.lastMessage;
                    symbol = ident;
                }
            }
            if (number !== 0) {
                const msg: Message = { number, text: this.normalize(text, file, lineNo), symbol, file, line: lineNo };
                const at = set.messages.findIndex(m => m.number > number);
                if (at === -1) set.messages.push(msg);
                else set.messages.splice(at, 0, msg);
            }
            this.totalMessages++;
            return;
        }
        if (/[^ \t\n\v\f\r]/.test(line)) this.error(file, lineNo, 'malformed line ignored');
    }

    /** Strips the quote characters and interprets escape sequences. */
    private normalize(s: string, file: string, lineNo: number): string {
        let i = 0;
        let out = '';
        const quoted = this.quote !== '' && s[0] === this.quote;
        if (quoted) i++;
        while (i < s.length) {
            const c = s[i];
            if (this.quote !== '' && c === this.quote) break;
            if (c !== '\\') { out += c; i++; continue; }
            i++;
            const n = s[i];
            if (this.quote !== '' && n === this.quote) { out += n; i++; continue; }
            const simple: Record<string, string> = { n: '\n', t: '\t', v: '\v', b: '\b', r: '\r', f: '\f', '\\': '\\' };
            if (n !== undefined && n in simple) { out += simple[n]; i++; continue; }
            if (n !== undefined && /[0-7]/.test(n)) {
                let v = Number(n);
                i++;
                while (v <= 255 / 8 && /[0-7]/.test(s[i] ?? '')) v = v * 8 + Number(s[i++]);
                out += String.fromCharCode(v & 0xff);
                continue;
            }
            // Any other escaped character stands for itself, minus the backslash.
        }
        if (quoted && s[i] !== this.quote) this.error(file, lineNo, 'unterminated message');
        return out;
    }

    /** read_old: merges an existing binary catalog (new messages win; an empty one deletes). */
    mergeOld(bytes: Uint8Array): boolean {
        if (bytes.length < 12) return false;
        const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        if (dv.getUint32(0, true) !== CATGETS_MAGIC) return false;
        const size = dv.getUint32(4, true), depth = dv.getUint32(8, true);
        const slots = size * depth;
        const stringsAt = 12 + slots * 3 * 4 * 2;
        if (stringsAt > bytes.length) return false;
        const str = (off: number) => {
            let s = '';
            for (let p = stringsAt + off; p < bytes.length && bytes[p] !== 0; p++) s += String.fromCharCode(bytes[p]);
            return s;
        };
        let lastSet = -1;
        let set: MessageSet | null = null;
        for (let cnt = 0; cnt < slots; cnt++) {
            const setNo = dv.getUint32(12 + cnt * 12, true);
            if (setNo === 0) continue;
            const msgNo = dv.getUint32(12 + cnt * 12 + 4, true);
            const off = dv.getUint32(12 + cnt * 12 + 8, true);
            if (setNo - 1 !== lastSet) { lastSet = setNo - 1; set = this.findSet(setNo - 1); }
            const list = set!.messages;
            const idx = list.findIndex(m => m.number >= msgNo);
            if (idx === -1 || list[idx].number > msgNo) {
                list.splice(idx === -1 ? list.length : idx, 0, { number: msgNo, text: str(off), symbol: null, file: null, line: 0 });
                this.totalMessages++;
            } else if (list[idx].text === '') {
                list.splice(idx, 1);
            }
        }
        return true;
    }

    /** write_out: the binary catalog. */
    encode(): Uint8Array {
        let bestTotal = Infinity, bestSize = Infinity, bestDepth = Infinity;
        for (let size = 1 + Math.floor(this.totalMessages / 5); size <= bestTotal; size++) {
            const deep = new Array<number>(size).fill(0);
            let depth = 1;
            for (const set of this.sets) {
                for (const m of set.messages) {
                    const idx = (m.number * set.number) % size;
                    if (++deep[idx] > depth) {
                        depth = deep[idx];
                        if (depth * size > bestTotal) break;
                    }
                }
            }
            if (depth * size <= bestTotal) { bestTotal = depth * size; bestSize = size; bestDepth = depth; }
        }
        if (bestSize === Infinity) { bestSize = 1; bestDepth = 1; }

        const slots = bestSize * bestDepth;
        const index = new Array<number>(slots * 3).fill(0);
        let strings = '';
        for (const set of this.sets) {
            for (const m of set.messages) {
                let idx = ((m.number * set.number) % bestSize) * 3;
                while (index[idx] !== 0) idx += bestSize * 3;
                index[idx] = set.number;
                index[idx + 1] = m.number;
                index[idx + 2] = strings.length;
                strings += m.text + '\0';
            }
        }
        const out = new Uint8Array(12 + slots * 24 + strings.length);
        const dv = new DataView(out.buffer);
        dv.setUint32(0, CATGETS_MAGIC, true);
        dv.setUint32(4, bestSize, true);
        dv.setUint32(8, bestDepth, true);
        index.forEach((v, i) => {
            dv.setUint32(12 + i * 4, v, true);
            dv.setUint32(12 + slots * 12 + i * 4, v, false);
        });
        for (let i = 0; i < strings.length; i++) out[12 + slots * 24 + i] = strings.charCodeAt(i) & 0xff;
        return out;
    }

    /** The -H header file with #defines for symbolic names. */
    header(): string {
        const hex = (n: number) => (n === 0 ? '0' : '0x' + n.toString(16));
        let out = '';
        let first = true;
        for (const set of this.sets) {
            if (set.symbol !== null) out += `${first ? '' : '\n'}#define ${set.symbol}Set ${hex(set.number - 1)}\t/* ${set.file}:${set.line} */\n`;
            first = false;
            for (const m of set.messages) {
                if (m.symbol === null) continue;
                const prefix = set.symbol === null ? `AutomaticSet${set.number}` : set.symbol;
                out += `#define ${prefix}${m.symbol} ${hex(m.number)}\t/* ${m.file}:${m.line} */\n`;
            }
        }
        return out;
    }
}
