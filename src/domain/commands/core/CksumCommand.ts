/**
 * cksum - write file checksums and sizes (POSIX). The CRC is the POSIX
 * CRC-32 (polynomial 0x04C11DB7, MSB first, length appended, inverted).
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { readInputBytes } from '../shared/InputFiles';

const TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i << 24;
        for (let k = 0; k < 8; k++) c = c & 0x80000000 ? (c << 1) ^ 0x04c11db7 : c << 1;
        t[i] = c >>> 0;
    }
    return t;
})();

export function posixCksum(data: Uint8Array): number {
    let crc = 0;
    const step = (b: number) => { crc = ((crc << 8) ^ TABLE[((crc >>> 24) ^ b) & 0xff]) >>> 0; };
    for (const b of data) step(b);
    for (let n = data.length; n > 0; n = Math.floor(n / 256)) step(n & 0xff);
    return (~crc) >>> 0;
}

export class CksumCommand extends Utility {
    readonly utility = 'cksum';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const operands = args[0] === '--' ? args.slice(1) : args;
        const bad = operands.find(a => a.startsWith('-') && a !== '-');
        if (bad) return this.usage(state, `unrecognized option '${bad}'`);
        let out = '';
        const errors: string[] = [];
        for (const f of operands.length ? operands : ['-']) {
            const input = readInputBytes(context, f);
            if (!input.ok) { errors.push(input.error); continue; }
            out += `${posixCksum(input.data)} ${input.data.length}${operands.length ? ` ${f}` : ''}\n`;
        }
        return this.respond(state, out, errors);
    }
}
