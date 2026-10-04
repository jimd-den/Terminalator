/**
 * Lzw - the Unix `compress` (.Z) format.
 *
 * Byte-compatible with ncompress/gzip: magic 1F 9D, a flags byte
 * (block mode | max bits), then LSB-first variable-width codes (9..maxbits)
 * written in groups of n_bits bytes; a group is padded when the code width
 * grows or the table is cleared, exactly as compress(1) does.
 */

const MAGIC_1 = 0x1f;
const MAGIC_2 = 0x9d;
const BLOCK_MODE = 0x80;
const CLEAR = 256;
const FIRST = 257;
const INIT_BITS = 9;

export class LzwError extends Error { }

export function isCompressed(data: Uint8Array): boolean {
    return data.length >= 3 && data[0] === MAGIC_1 && data[1] === MAGIC_2;
}

export function lzwCompress(input: Uint8Array, maxBits = 16): Uint8Array {
    if (maxBits < INIT_BITS || maxBits > 16) throw new LzwError(`invalid bits: ${maxBits}`);
    const out: number[] = [MAGIC_1, MAGIC_2, BLOCK_MODE | maxBits];
    const maxMaxCode = 1 << maxBits;

    let nBits = INIT_BITS;
    let maxCode = (1 << nBits) - 1;
    let freeEnt = FIRST;
    let buf = new Uint8Array(16);
    let offset = 0; // bit offset in the current group

    const output = (code: number) => {
        let bit = offset;
        for (let i = 0; i < nBits; i++, bit++) {
            if (code & (1 << i)) buf[bit >> 3] |= 1 << (bit & 7);
        }
        offset += nBits;
        if (offset === nBits << 3) {
            for (let i = 0; i < nBits; i++) out.push(buf[i]);
            buf = new Uint8Array(16);
            offset = 0;
        }
        if (freeEnt > maxCode) {
            if (offset > 0) {
                for (let i = 0; i < nBits; i++) out.push(buf[i]);
                buf = new Uint8Array(16);
            }
            offset = 0;
            nBits++;
            maxCode = nBits === maxBits ? maxMaxCode : (1 << nBits) - 1;
        }
    };

    if (input.length === 0) return Uint8Array.from(out);

    const table = new Map<number, number>();
    let ent = input[0];
    for (let i = 1; i < input.length; i++) {
        const c = input[i];
        const key = (ent << 8) | c;
        const code = table.get(key);
        if (code !== undefined) {
            ent = code;
            continue;
        }
        output(ent);
        ent = c;
        if (freeEnt < maxMaxCode) table.set(key, freeEnt++);
    }
    output(ent);
    if (offset > 0) for (let i = 0; i < (offset + 7) >> 3; i++) out.push(buf[i]);
    return Uint8Array.from(out);
}

export function lzwDecompress(data: Uint8Array): Uint8Array {
    if (!isCompressed(data)) throw new LzwError('not in compressed format');
    const maxBits = data[2] & 0x1f;
    const blockMode = (data[2] & BLOCK_MODE) !== 0;
    if (maxBits > 16 || maxBits < INIT_BITS) throw new LzwError(`compressed with ${maxBits} bits, can only handle 16 bits`);
    const maxMaxCode = 1 << maxBits;

    const prefix = new Uint16Array(maxMaxCode);
    const suffix = new Uint8Array(maxMaxCode);
    for (let i = 0; i < 256; i++) suffix[i] = i;

    let pos = 3;
    let nBits = INIT_BITS;
    let maxCode = (1 << nBits) - 1;
    let freeEnt = blockMode ? FIRST : 256;
    let clearFlag = false;
    let group: Uint8Array = new Uint8Array(0);
    let offset = 0;
    let size = 0;

    const getCode = (): number => {
        if (clearFlag || offset >= size || freeEnt > maxCode) {
            if (freeEnt > maxCode) {
                nBits++;
                maxCode = nBits === maxBits ? maxMaxCode : (1 << nBits) - 1;
            }
            if (clearFlag) {
                nBits = INIT_BITS;
                maxCode = (1 << nBits) - 1;
                clearFlag = false;
            }
            const n = Math.min(nBits, data.length - pos);
            if (n <= 0) return -1;
            group = data.subarray(pos, pos + n);
            pos += n;
            offset = 0;
            size = (n << 3) - (nBits - 1);
        }
        let code = 0;
        for (let i = 0; i < nBits; i++) {
            const bit = offset + i;
            if (group[bit >> 3] & (1 << (bit & 7))) code |= 1 << i;
        }
        offset += nBits;
        return code;
    };

    const out: number[] = [];
    let oldCode = getCode();
    if (oldCode === -1) return new Uint8Array(0);
    let finChar = oldCode;
    out.push(finChar);

    const stack: number[] = [];
    let code: number;
    while ((code = getCode()) > -1) {
        if (code === CLEAR && blockMode) {
            prefix.fill(0, 0, 256);
            clearFlag = true;
            freeEnt = FIRST - 1;
            if ((code = getCode()) === -1) break;
        }
        const inCode = code;
        if (code >= freeEnt) {
            if (code > freeEnt) throw new LzwError('corrupt input');
            stack.push(finChar);
            code = oldCode;
        }
        while (code >= 256) {
            stack.push(suffix[code]);
            code = prefix[code];
        }
        finChar = suffix[code];
        stack.push(finChar);
        while (stack.length) out.push(stack.pop()!);

        if (freeEnt < maxMaxCode) {
            prefix[freeEnt] = oldCode;
            suffix[freeEnt] = finChar;
            freeEnt++;
        }
        oldCode = inCode;
    }
    return Uint8Array.from(out);
}
