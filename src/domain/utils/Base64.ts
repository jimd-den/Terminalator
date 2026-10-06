/** RFC 4648 base64 (no dependency on platform btoa/Buffer). */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64Encode(data: Uint8Array): string {
    let out = '';
    for (let i = 0; i < data.length; i += 3) {
        const a = data[i], b = data[i + 1], c = data[i + 2];
        out += ALPHABET[a >> 2] + ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)];
        out += b === undefined ? '=' : ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)];
        out += c === undefined ? '=' : ALPHABET[c & 63];
    }
    return out;
}

export function base64Decode(text: string, ignoreGarbage = false): Uint8Array {
    const clean = text.replace(/\s+/g, '');
    const out: number[] = [];
    let buf = 0, bits = 0;
    for (const ch of clean) {
        if (ch === '=') break;
        const v = ALPHABET.indexOf(ch);
        if (v < 0) {
            if (ignoreGarbage) continue;
            throw new Error('invalid input');
        }
        buf = (buf << 6) | v;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            out.push((buf >> bits) & 0xff);
        }
    }
    return Uint8Array.from(out);
}
