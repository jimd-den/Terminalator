/**
 * Deflate - the DEFLATE compressed data format (RFC 1951), pure TypeScript.
 *
 *   deflateRaw(bytes, level)  -> raw DEFLATE stream (no zlib/gzip framing)
 *   inflateRaw(bytes, offset) -> { data, end }  (end = offset just past the stream)
 *
 * The encoder is an LZ77 matcher over a 32 KiB window (hash chains, with
 * zlib-style lazy matching from level 4 up) feeding blocks that are emitted
 * as stored, fixed-Huffman or dynamic-Huffman, whichever is smallest.
 * Dynamic codes are length-limited (15 bits, 7 for the code-length code)
 * the way zlib does it, so any conforming inflater (gzip, zlib) reads them.
 */

export class DeflateError extends Error { }

// ---------------------------------------------------------------- tables

const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

const FIXED_LIT_LENGTHS: number[] = Array.from({ length: 288 }, (_, i) => (i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8));
const FIXED_DIST_LENGTHS: number[] = new Array(30).fill(5);

/** Length (3..258) -> length code index 0..28. */
const LENGTH_CODE: Uint8Array = (() => {
    const t = new Uint8Array(259);
    for (let code = 0; code < 29; code++) {
        const span = code === 28 ? 1 : 1 << LENGTH_EXTRA[code];
        for (let k = 0; k < span && LENGTH_BASE[code] + k <= 258; k++) t[LENGTH_BASE[code] + k] = code;
    }
    t[258] = 28;
    return t;
})();

function distCode(dist: number): number {
    let lo = 0, hi = 29;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (DIST_BASE[mid] <= dist) lo = mid; else hi = mid - 1;
    }
    return lo;
}

// ---------------------------------------------------------------- inflate

class BitReader {
    private bitBuf = 0;
    private bitCnt = 0;
    constructor(private readonly src: Uint8Array, public pos: number) { }

    bits(n: number): number {
        let val = this.bitBuf;
        while (this.bitCnt < n) {
            if (this.pos >= this.src.length) throw new DeflateError('unexpected end of file');
            val |= this.src[this.pos++] << this.bitCnt;
            this.bitCnt += 8;
        }
        this.bitBuf = val >>> n;
        this.bitCnt -= n;
        return val & ((1 << n) - 1);
    }

    /** Discards the remaining bits of the current byte. */
    align(): void {
        this.bitBuf = 0;
        this.bitCnt = 0;
    }
}

/** Canonical Huffman decoding table: counts per length and symbols in code order. */
interface Huffman { count: Int16Array; symbol: Int16Array; }

function buildHuffman(lengths: ArrayLike<number>, n: number): { h: Huffman; left: number } {
    const count = new Int16Array(16);
    const symbol = new Int16Array(n);
    for (let s = 0; s < n; s++) count[lengths[s]]++;
    let left = 1;
    for (let len = 1; len < 16; len++) {
        left <<= 1;
        left -= count[len];
        if (left < 0) return { h: { count, symbol }, left };
    }
    const offs = new Int16Array(16);
    for (let len = 1; len < 15; len++) offs[len + 1] = offs[len] + count[len];
    for (let s = 0; s < n; s++) if (lengths[s] !== 0) symbol[offs[lengths[s]]++] = s;
    return { h: { count, symbol }, left };
}

function decodeSym(br: BitReader, h: Huffman): number {
    let code = 0, first = 0, index = 0;
    for (let len = 1; len < 16; len++) {
        code |= br.bits(1);
        const count = h.count[len];
        if (code - count < first) return h.symbol[index + (code - first)];
        index += count;
        first += count;
        first <<= 1;
        code <<= 1;
    }
    throw new DeflateError('invalid code');
}

class ByteSink {
    buf: Uint8Array;
    len = 0;
    constructor(initial = 1024) { this.buf = new Uint8Array(initial); }
    ensure(extra: number) {
        if (this.len + extra <= this.buf.length) return;
        let size = this.buf.length * 2;
        while (size < this.len + extra) size *= 2;
        const next = new Uint8Array(size);
        next.set(this.buf.subarray(0, this.len));
        this.buf = next;
    }
    push(b: number) { this.ensure(1); this.buf[this.len++] = b; }
    result(): Uint8Array { return this.buf.slice(0, this.len); }
}

const FIXED_LIT = buildHuffman(FIXED_LIT_LENGTHS, 288).h;
const FIXED_DIST = buildHuffman(FIXED_DIST_LENGTHS, 30).h;

function inflateCodes(br: BitReader, out: ByteSink, lit: Huffman, dist: Huffman): void {
    for (;;) {
        const sym = decodeSym(br, lit);
        if (sym < 256) { out.push(sym); continue; }
        if (sym === 256) return;
        const li = sym - 257;
        if (li >= 29) throw new DeflateError('invalid literal/length code');
        const length = LENGTH_BASE[li] + br.bits(LENGTH_EXTRA[li]);
        const di = decodeSym(br, dist);
        if (di >= 30) throw new DeflateError('invalid distance code');
        const d = DIST_BASE[di] + br.bits(DIST_EXTRA[di]);
        if (d > out.len) throw new DeflateError('invalid distance too far back');
        out.ensure(length);
        const buf = out.buf;
        let p = out.len;
        for (let k = 0; k < length; k++, p++) buf[p] = buf[p - d];
        out.len = p;
    }
}

function inflateDynamic(br: BitReader): { lit: Huffman; dist: Huffman } {
    const nlen = br.bits(5) + 257;
    const ndist = br.bits(5) + 1;
    const ncode = br.bits(4) + 4;
    if (nlen > 286 || ndist > 30) throw new DeflateError('bad counts');
    const lengths = new Array(320).fill(0);
    for (let i = 0; i < ncode; i++) lengths[CL_ORDER[i]] = br.bits(3);
    const cl = buildHuffman(lengths, 19);
    if (cl.left !== 0) throw new DeflateError('invalid code lengths set');
    lengths.fill(0);
    let index = 0;
    while (index < nlen + ndist) {
        let sym = decodeSym(br, cl.h);
        if (sym < 16) { lengths[index++] = sym; continue; }
        let len = 0;
        if (sym === 16) {
            if (index === 0) throw new DeflateError('repeat with no first length');
            len = lengths[index - 1];
            sym = 3 + br.bits(2);
        } else if (sym === 17) sym = 3 + br.bits(3);
        else sym = 11 + br.bits(7);
        if (index + sym > nlen + ndist) throw new DeflateError('too many lengths');
        while (sym--) lengths[index++] = len;
    }
    if (lengths[256] === 0) throw new DeflateError('missing end-of-block code');
    const lit = buildHuffman(lengths.slice(0, nlen), nlen);
    if (lit.left < 0 || (lit.left > 0 && nlen - lit.h.count[0] !== 1)) throw new DeflateError('invalid literal/lengths set');
    const dist = buildHuffman(lengths.slice(nlen, nlen + ndist), ndist);
    if (dist.left < 0 || (dist.left > 0 && ndist - dist.h.count[0] !== 1)) throw new DeflateError('invalid distances set');
    return { lit: lit.h, dist: dist.h };
}

export function inflateRaw(src: Uint8Array, offset = 0): { data: Uint8Array; end: number } {
    const br = new BitReader(src, offset);
    const out = new ByteSink(Math.max(1024, (src.length - offset) * 3));
    let last = 0;
    do {
        last = br.bits(1);
        const type = br.bits(2);
        if (type === 0) {
            br.align();
            if (br.pos + 4 > src.length) throw new DeflateError('unexpected end of file');
            const len = src[br.pos] | (src[br.pos + 1] << 8);
            const nlen = src[br.pos + 2] | (src[br.pos + 3] << 8);
            if (len !== (~nlen & 0xffff)) throw new DeflateError('invalid stored block lengths');
            br.pos += 4;
            if (br.pos + len > src.length) throw new DeflateError('unexpected end of file');
            out.ensure(len);
            out.buf.set(src.subarray(br.pos, br.pos + len), out.len);
            out.len += len;
            br.pos += len;
        } else if (type === 1) {
            inflateCodes(br, out, FIXED_LIT, FIXED_DIST);
        } else if (type === 2) {
            const { lit, dist } = inflateDynamic(br);
            inflateCodes(br, out, lit, dist);
        } else {
            throw new DeflateError('invalid block type');
        }
    } while (!last);
    return { data: out.result(), end: br.pos };
}

// ---------------------------------------------------------------- deflate

class BitWriter {
    private out = new ByteSink(1024);
    private bitBuf = 0;
    private bitCnt = 0;

    bits(value: number, n: number): void {
        this.bitBuf |= value << this.bitCnt;
        this.bitCnt += n;
        while (this.bitCnt >= 8) {
            this.out.push(this.bitBuf & 0xff);
            this.bitBuf >>>= 8;
            this.bitCnt -= 8;
        }
    }

    /** A Huffman code: transmitted most significant bit first. */
    code(code: number, len: number): void {
        let rev = 0;
        for (let i = 0; i < len; i++) { rev = (rev << 1) | (code & 1); code >>= 1; }
        this.bits(rev, len);
    }

    align(): void {
        if (this.bitCnt > 0) this.bits(0, 8 - this.bitCnt);
    }

    bytes(data: Uint8Array): void {
        this.out.ensure(data.length);
        this.out.buf.set(data, this.out.len);
        this.out.len += data.length;
    }

    result(): Uint8Array {
        this.align();
        return this.out.result();
    }
}

/**
 * Code lengths for the given frequencies, limited to maxBits
 * (Huffman's algorithm, then zlib's overflow redistribution).
 */
export function huffmanLengths(freqs: ArrayLike<number>, maxBits: number): number[] {
    const n = freqs.length;
    const lengths = new Array(n).fill(0);
    const used: number[] = [];
    for (let s = 0; s < n; s++) if (freqs[s] > 0) used.push(s);
    if (used.length === 0) return lengths;
    if (used.length === 1) { lengths[used[0]] = 1; return lengths; }

    // Huffman tree over nodes: leaves 0..k-1, internal nodes after.
    const weight: number[] = used.map(s => freqs[s]);
    const parent: number[] = new Array(used.length).fill(-1);
    const heap: number[] = used.map((_, i) => i);
    const less = (a: number, b: number) => weight[a] < weight[b] || (weight[a] === weight[b] && a < b);
    const siftDown = (i: number) => {
        for (;;) {
            const l = 2 * i + 1, r = l + 1;
            let m = i;
            if (l < heap.length && less(heap[l], heap[m])) m = l;
            if (r < heap.length && less(heap[r], heap[m])) m = r;
            if (m === i) return;
            [heap[i], heap[m]] = [heap[m], heap[i]];
            i = m;
        }
    };
    const pop = () => {
        const top = heap[0];
        const last = heap.pop()!;
        if (heap.length) { heap[0] = last; siftDown(0); }
        return top;
    };
    const push = (node: number) => {
        heap.push(node);
        let i = heap.length - 1;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (!less(heap[i], heap[p])) break;
            [heap[i], heap[p]] = [heap[p], heap[i]];
            i = p;
        }
    };
    for (let i = (heap.length >> 1) - 1; i >= 0; i--) siftDown(i);
    while (heap.length > 1) {
        const a = pop(), b = pop();
        const node = weight.length;
        weight.push(weight[a] + weight[b]);
        parent.push(-1);
        parent[a] = node;
        parent[b] = node;
        push(node);
    }

    // Depth of each leaf, clamped to maxBits; count lengths.
    const blCount = new Array(maxBits + 1).fill(0);
    let overflow = 0;
    const depth: number[] = new Array(weight.length).fill(0);
    for (let node = weight.length - 2; node >= 0; node--) depth[node] = depth[parent[node]] + 1;
    for (let i = 0; i < used.length; i++) {
        let d = depth[i];
        if (d > maxBits) { d = maxBits; overflow++; }
        blCount[d]++;
    }
    while (overflow > 0) {
        let bits = maxBits - 1;
        while (blCount[bits] === 0) bits--;
        blCount[bits]--;
        blCount[bits + 1] += 2;
        blCount[maxBits]--;
        overflow -= 2;
    }
    // Hand out the lengths: least frequent symbols get the longest codes.
    const order = used.map((s, i) => i).sort((a, b) => weight[a] - weight[b] || depth[b] - depth[a] || a - b);
    let k = 0;
    for (let bits = maxBits; bits >= 1; bits--) {
        for (let c = 0; c < blCount[bits]; c++) lengths[used[order[k++]]] = bits;
    }
    return lengths;
}

/** Canonical codes for the given code lengths. */
function canonicalCodes(lengths: number[]): number[] {
    const blCount = new Array(16).fill(0);
    for (const l of lengths) if (l) blCount[l]++;
    const next = new Array(16).fill(0);
    let code = 0;
    for (let bits = 1; bits < 16; bits++) { next[bits] = code; code = (code + blCount[bits]) << 1; }
    return lengths.map(l => (l ? next[l]++ : 0));
}

interface LevelConfig { good: number; lazy: number; nice: number; chain: number; useLazy: boolean; }

const LEVELS: LevelConfig[] = [
    { good: 0, lazy: 0, nice: 0, chain: 0, useLazy: false },
    { good: 4, lazy: 4, nice: 8, chain: 4, useLazy: false },
    { good: 4, lazy: 5, nice: 16, chain: 8, useLazy: false },
    { good: 4, lazy: 6, nice: 32, chain: 32, useLazy: false },
    { good: 4, lazy: 4, nice: 16, chain: 16, useLazy: true },
    { good: 8, lazy: 16, nice: 32, chain: 32, useLazy: true },
    { good: 8, lazy: 16, nice: 128, chain: 128, useLazy: true },
    { good: 8, lazy: 32, nice: 128, chain: 256, useLazy: true },
    { good: 32, lazy: 128, nice: 258, chain: 1024, useLazy: true },
    { good: 32, lazy: 258, nice: 258, chain: 4096, useLazy: true },
];

const WSIZE = 32768;
const WMASK = WSIZE - 1;
const HASH_BITS = 15;
const MIN_MATCH = 3;
const MAX_MATCH = 258;
const BLOCK_SYMBOLS = 16384;

/** Emits a block of LZ77 symbols (lit < 256, or 256 + length with a distance) in the cheapest form. */
class BlockWriter {
    constructor(private readonly w: BitWriter, private readonly src: Uint8Array) { }

    write(lits: Uint16Array, dists: Uint16Array, count: number, start: number, end: number, last: boolean): void {
        const litFreq = new Array(286).fill(0);
        const distFreq = new Array(30).fill(0);
        for (let i = 0; i < count; i++) {
            if (dists[i] === 0) litFreq[lits[i]]++;
            else { litFreq[257 + LENGTH_CODE[lits[i]]]++; distFreq[distCode(dists[i])]++; }
        }
        litFreq[256] = 1;
        // At least two distance codes, as zlib does, so every inflater accepts the tree.
        let nonzero = distFreq.filter(f => f > 0).length;
        for (let s = 0; nonzero < 2; s++) if (distFreq[s] === 0) { distFreq[s] = 1; nonzero++; }

        const litLen = huffmanLengths(litFreq, 15);
        const distLen = huffmanLengths(distFreq, 15);
        let hlit = 286; while (hlit > 257 && litLen[hlit - 1] === 0) hlit--;
        let hdist = 30; while (hdist > 1 && distLen[hdist - 1] === 0) hdist--;
        const rle = this.runLengths([...litLen.slice(0, hlit), ...distLen.slice(0, hdist)]);
        const clFreq = new Array(19).fill(0);
        for (const [sym] of rle) clFreq[sym]++;
        const clLen = huffmanLengths(clFreq, 7);
        let hclen = 19; while (hclen > 4 && clLen[CL_ORDER[hclen - 1]] === 0) hclen--;

        const extraBits = this.extraBits(litFreq, distFreq);
        const dataBits = (lens: number[], dlens: number[]) =>
            litFreq.reduce((s, f, i) => s + f * (lens[i] || 0), 0) + distFreq.reduce((s, f, i) => s + f * (dlens[i] || 0), 0) + extraBits;
        // Frequencies padded for unused distance codes must not count in the real cost, but they are tiny.
        let dynBits = 3 + 14 + hclen * 3 + dataBits(litLen, distLen);
        for (const [sym] of rle) dynBits += clLen[sym] + (sym === 16 ? 2 : sym === 17 ? 3 : sym === 18 ? 7 : 0);
        const fixedBits = 3 + dataBits(FIXED_LIT_LENGTHS, FIXED_DIST_LENGTHS);
        const storedLen = end - start;
        const storedBits = (Math.ceil(storedLen / 65535) || 1) * 40 + storedLen * 8 + 7;

        if (storedBits <= fixedBits && storedBits <= dynBits) {
            this.stored(start, end, last);
        } else if (fixedBits <= dynBits) {
            this.w.bits(last ? 1 : 0, 1);
            this.w.bits(1, 2);
            this.symbols(lits, dists, count, FIXED_LIT_LENGTHS, FIXED_DIST_LENGTHS);
        } else {
            this.w.bits(last ? 1 : 0, 1);
            this.w.bits(2, 2);
            this.w.bits(hlit - 257, 5);
            this.w.bits(hdist - 1, 5);
            this.w.bits(hclen - 4, 4);
            for (let i = 0; i < hclen; i++) this.w.bits(clLen[CL_ORDER[i]], 3);
            const clCodes = canonicalCodes(clLen);
            for (const [sym, extra] of rle) {
                this.w.code(clCodes[sym], clLen[sym]);
                if (sym === 16) this.w.bits(extra, 2);
                else if (sym === 17) this.w.bits(extra, 3);
                else if (sym === 18) this.w.bits(extra, 7);
            }
            this.symbols(lits, dists, count, litLen, distLen);
        }
    }

    stored(start: number, end: number, last: boolean): void {
        let pos = start;
        do {
            const len = Math.min(65535, end - pos);
            const final = last && pos + len >= end;
            this.w.bits(final ? 1 : 0, 1);
            this.w.bits(0, 2);
            this.w.align();
            this.w.bits(len & 0xffff, 16);
            this.w.bits(~len & 0xffff, 16);
            this.w.bytes(this.src.subarray(pos, pos + len));
            pos += len;
        } while (pos < end);
    }

    private extraBits(litFreq: number[], distFreq: number[]): number {
        let bits = 0;
        for (let c = 0; c < 29; c++) bits += litFreq[257 + c] * LENGTH_EXTRA[c];
        for (let c = 0; c < 30; c++) bits += distFreq[c] * DIST_EXTRA[c];
        return bits;
    }

    private symbols(lits: Uint16Array, dists: Uint16Array, count: number, litLen: number[], distLen: number[]): void {
        const litCodes = canonicalCodes(litLen);
        const distCodes = canonicalCodes(distLen);
        const w = this.w;
        for (let i = 0; i < count; i++) {
            const d = dists[i];
            if (d === 0) { w.code(litCodes[lits[i]], litLen[lits[i]]); continue; }
            const len = lits[i];
            const lc = LENGTH_CODE[len];
            w.code(litCodes[257 + lc], litLen[257 + lc]);
            if (LENGTH_EXTRA[lc]) w.bits(len - LENGTH_BASE[lc], LENGTH_EXTRA[lc]);
            const dc = distCode(d);
            w.code(distCodes[dc], distLen[dc]);
            if (DIST_EXTRA[dc]) w.bits(d - DIST_BASE[dc], DIST_EXTRA[dc]);
        }
        w.code(litCodes[256], litLen[256]);
    }

    /** Code-length run-length encoding: [symbol, extra] pairs (16 = repeat, 17/18 = zeros). */
    private runLengths(lengths: number[]): [number, number][] {
        const out: [number, number][] = [];
        let i = 0;
        while (i < lengths.length) {
            const l = lengths[i];
            let run = 1;
            while (i + run < lengths.length && lengths[i + run] === l) run++;
            i += run;
            if (l === 0) {
                while (run >= 11) { const r = Math.min(run, 138); out.push([18, r - 11]); run -= r; }
                if (run >= 3) { out.push([17, run - 3]); run = 0; }
                while (run-- > 0) out.push([0, 0]);
            } else {
                out.push([l, 0]);
                run--;
                while (run >= 3) { const r = Math.min(run, 6); out.push([16, r - 3]); run -= r; }
                while (run-- > 0) out.push([l, 0]);
            }
        }
        return out;
    }
}

export function deflateRaw(src: Uint8Array, level = 6): Uint8Array {
    const w = new BitWriter();
    const blocks = new BlockWriter(w, src);
    const n = src.length;
    if (level <= 0 || n === 0) {
        if (n === 0) { w.bits(1, 1); w.bits(1, 2); w.code(0, 7); return w.result(); }
        blocks.stored(0, n, true);
        return w.result();
    }
    const cfg = LEVELS[Math.min(level, 9)];
    const head = new Int32Array(1 << HASH_BITS).fill(-1);
    const prev = new Int32Array(WSIZE).fill(-1);
    const hash = (i: number) => ((src[i] << 10) ^ (src[i + 1] << 5) ^ src[i + 2]) & ((1 << HASH_BITS) - 1);
    const insert = (i: number) => {
        if (i + MIN_MATCH > n) return;
        const h = hash(i);
        prev[i & WMASK] = head[h];
        head[h] = i;
    };
    let bestDist = 0;
    const longest = (i: number, prevLen: number): number => {
        if (i + MIN_MATCH > n) return 0;
        const maxLen = Math.min(MAX_MATCH, n - i);
        let chain = prevLen >= cfg.good ? cfg.chain >> 2 : cfg.chain;
        let best = prevLen;
        let cand = head[hash(i)];
        bestDist = 0;
        while (cand >= 0 && i - cand <= WSIZE && chain-- > 0) {
            if (src[cand + best] === src[i + best] && src[cand] === src[i]) {
                let len = 0;
                while (len < maxLen && src[cand + len] === src[i + len]) len++;
                if (len > best) {
                    best = len;
                    bestDist = i - cand;
                    if (len >= cfg.nice || len >= maxLen) break;
                }
            }
            const next = prev[cand & WMASK];
            if (next >= cand) break;
            cand = next;
        }
        return bestDist ? best : 0;
    };

    const lits = new Uint16Array(BLOCK_SYMBOLS);
    const dists = new Uint16Array(BLOCK_SYMBOLS);
    let count = 0;
    let blockStart = 0;
    const flushIfFull = (pos: number) => {
        if (count < BLOCK_SYMBOLS - 1) return;
        blocks.write(lits, dists, count, blockStart, pos, false);
        count = 0;
        blockStart = pos;
    };

    let i = 0;
    let pending: { len: number; dist: number } | null = null;
    while (i < n) {
        let len: number, dist: number;
        if (pending) { ({ len, dist } = pending); pending = null; }
        else { len = longest(i, MIN_MATCH - 1); dist = bestDist; }
        if (len >= MIN_MATCH && cfg.useLazy && len < cfg.lazy && i + 1 < n) {
            insert(i);
            const len2 = longest(i + 1, len);
            if (len2 > len) {
                pending = { len: len2, dist: bestDist };
                lits[count] = src[i]; dists[count++] = 0;
                i++;
                flushIfFull(i);
                continue;
            }
            lits[count] = len; dists[count++] = dist;
            for (let k = 1; k < len; k++) insert(i + k);
            i += len;
        } else if (len >= MIN_MATCH) {
            lits[count] = len; dists[count++] = dist;
            for (let k = 0; k < len; k++) insert(i + k);
            i += len;
        } else {
            lits[count] = src[i]; dists[count++] = 0;
            insert(i);
            i++;
        }
        flushIfFull(i);
    }
    blocks.write(lits, dists, count, blockStart, n, true);
    return w.result();
}
