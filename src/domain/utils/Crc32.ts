/**
 * Crc32 - the ISO 3309 / ITU-T V.42 CRC-32 used by gzip, zip and PNG
 * (reflected polynomial 0xEDB88320, initial value and final XOR 0xFFFFFFFF).
 *
 *   crc32(bytes)               // checksum of a whole buffer
 *   crc32(more, crc32(first))  // incremental: same as crc32(first ++ more)
 */

const TABLE: Uint32Array = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

export function crc32(data: Uint8Array, previous = 0): number {
    let crc = (previous ^ 0xffffffff) >>> 0;
    for (let i = 0; i < data.length; i++) crc = TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}
