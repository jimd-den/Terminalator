/**
 * split - split files into pieces (POSIX):
 *   split [-l line_count] [-a suffix_length] [file [name]]
 *   split -b n[k|m] [-a suffix_length] [file [name]]
 * plus GNU -d (numeric suffixes).
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { getopt, readInputBytes } from '../shared/InputFiles';
import { strerror } from '../shared/PathOps';

export function suffix(index: number, length: number, numeric: boolean): string | null {
    const base = numeric ? 10 : 26;
    if (index >= base ** length) return null;
    let s = '';
    for (let k = 0; k < length; k++) {
        const d = index % base;
        s = (numeric ? String(d) : String.fromCharCode(97 + d)) + s;
        index = Math.floor(index / base);
    }
    return s;
}

export class SplitCommand extends Utility {
    readonly utility = 'split';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const normalized = args.map(a => (/^-[0-9]+$/.test(a) ? `-l${a.substring(1)}` : a));
        const { opts, operands, error } = getopt(normalized, 'l:b:a:d');
        if (error) return this.usage(state, error);
        if (operands.length > 2) return this.usage(state, `extra operand '${operands[2]}'`);
        const suffixLen = opts.has('a') ? Number(opts.get('a')) : 2;
        if (!Number.isInteger(suffixLen) || suffixLen < 1) return this.usage(state, `invalid suffix length: '${opts.get('a')}'`);

        let byBytes: number | null = null;
        let lineCount = 1000;
        if (opts.has('b')) {
            const m = /^([0-9]+)([kmKMG]?)$/.exec(String(opts.get('b')));
            if (!m || m[1] === '0') return this.usage(state, `invalid number of bytes: '${opts.get('b')}'`);
            byBytes = parseInt(m[1], 10) * ({ '': 1, k: 1024, K: 1024, m: 1 << 20, M: 1 << 20, G: 1 << 30 } as Record<string, number>)[m[2]];
        } else if (opts.has('l')) {
            lineCount = Number(opts.get('l'));
            if (!Number.isInteger(lineCount) || lineCount < 1) return this.usage(state, `invalid number of lines: '${opts.get('l')}'`);
        }

        const input = readInputBytes(context, operands[0] ?? '-');
        if (!input.ok) return this.respond(state, '', [`cannot open ${input.error.replace(/^([^:]*):/, "'$1' for reading:")}`]);
        const prefix = operands[1] ?? 'x';
        const data = input.data;

        const pieces: Uint8Array[] = [];
        if (byBytes !== null) {
            for (let i = 0; i < data.length; i += byBytes) pieces.push(data.subarray(i, i + byBytes));
        } else {
            let start = 0, lines = 0;
            for (let i = 0; i < data.length; i++) {
                if (data[i] === 10 && ++lines === lineCount) {
                    pieces.push(data.subarray(start, i + 1));
                    start = i + 1;
                    lines = 0;
                }
            }
            if (start < data.length) pieces.push(data.subarray(start));
        }

        const fs = context.fileSystemService;
        for (let i = 0; i < pieces.length; i++) {
            const sfx = suffix(i, suffixLen, opts.has('d'));
            if (sfx === null) return this.respond(state, '', ['output file suffixes exhausted']);
            try {
                fs.writeFile(fs.resolveAbsolutePath(prefix + sfx, context.cwd), pieces[i], 'w', undefined, undefined, '/');
            } catch (e) {
                return this.respond(state, '', [`${prefix + sfx}: ${strerror(e)}`]);
            }
        }
        return this.respond(state, '');
    }
}
