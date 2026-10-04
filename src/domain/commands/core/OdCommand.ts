/**
 * od - dump files in various formats (POSIX XCU od), with GNU-compatible
 * layout: -A d|o|x|n, -b -c -d -o -s -x, -j skip, -N count, -t type...,
 * -v, -w width. Types: a, c, d|o|u|x[1248CSIL], f[48FDL], with the `z`
 * suffix for a printable-text column.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { readInputBytes } from '../shared/InputFiles';

type Kind = 'a' | 'c' | 'd' | 'o' | 'u' | 'x' | 'f';

interface Format {
    kind: Kind;
    size: number;
    width: number; // natural field width including the leading space
    text: boolean; // trailing >...< column
}

const INT_WIDTH: Record<string, number[]> = {
    // size:           1  2   4   8
    d: [0, 5, 7, 0, 12, 0, 0, 0, 21],
    o: [0, 4, 7, 0, 12, 0, 0, 0, 23],
    u: [0, 4, 6, 0, 11, 0, 0, 0, 21],
    x: [0, 3, 5, 0, 9, 0, 0, 0, 17],
};

const NAMES = ['nul', 'soh', 'stx', 'etx', 'eot', 'enq', 'ack', 'bel', 'bs', 'ht', 'nl', 'vt', 'ff', 'cr', 'so', 'si',
    'dle', 'dc1', 'dc2', 'dc3', 'dc4', 'nak', 'syn', 'etb', 'can', 'em', 'sub', 'esc', 'fs', 'gs', 'rs', 'us', 'sp'];
const C_ESCAPES: Record<number, string> = { 0: '\\0', 7: '\\a', 8: '\\b', 9: '\\t', 10: '\\n', 11: '\\v', 12: '\\f', 13: '\\r' };

class OdError extends Error { }

function parseFormat(spec: string): Format[] {
    const out: Format[] = [];
    let i = 0;
    while (i < spec.length) {
        const kind = spec[i++] as Kind;
        if (!'acdouxf'.includes(kind)) throw new OdError(`invalid type string '${spec}'`);
        let size = kind === 'a' || kind === 'c' ? 1 : kind === 'f' ? 8 : 4;
        const m = /^([0-9]+|[CSILFDL])/.exec(spec.substring(i));
        if (m && kind !== 'a' && kind !== 'c') {
            i += m[1].length;
            const map: Record<string, number> = kind === 'f' ? { F: 4, D: 8, L: 8 } : { C: 1, S: 2, I: 4, L: 8 };
            size = /[0-9]/.test(m[1]) ? parseInt(m[1], 10) : map[m[1]];
            const valid = kind === 'f' ? [4, 8] : [1, 2, 4, 8];
            if (!valid.includes(size)) throw new OdError(`invalid type string '${spec}'; this system doesn't provide a ${m[1]}-byte ${kind === 'f' ? 'floating point' : 'integral'} type`);
        }
        let text = false;
        if (spec[i] === 'z') { text = true; i++; }
        const width = kind === 'a' || kind === 'c' ? 4 : kind === 'f' ? (size === 4 ? 16 : 25) : INT_WIDTH[kind][size];
        out.push({ kind, size, width, text });
    }
    return out;
}

function parseCount(s: string): number {
    const m = /^(0[xX][0-9a-fA-F]+|0[0-7]*|[1-9][0-9]*)([bkmKMG]?|kB|MB)$/.exec(s);
    if (!m) throw new OdError(`invalid number '${s}'`);
    const n = /^0[xX]/.test(m[1]) ? parseInt(m[1], 16) : m[1].length > 1 && m[1][0] === '0' ? parseInt(m[1], 8) : parseInt(m[1], 10);
    const mult: Record<string, number> = { '': 1, b: 512, k: 1024, K: 1024, m: 1048576, M: 1048576, G: 1 << 30, kB: 1000, MB: 1000000 };
    return n * mult[m[2]];
}

/** C %g with the given precision. */
function formatG(v: number, p: number): string {
    if (v === 0) return Object.is(v, -0) ? '-0' : '0';
    if (!isFinite(v)) return isNaN(v) ? 'nan' : v < 0 ? '-inf' : 'inf';
    const exp = Math.floor(Math.log10(Math.abs(Number(v.toExponential(p - 1)))));
    if (exp < -4 || exp >= p) {
        const [mant, e] = v.toExponential(p - 1).split('e');
        const m = mant.includes('.') ? mant.replace(/0+$/, '').replace(/\.$/, '') : mant;
        const n = parseInt(e, 10);
        return `${m}e${n < 0 ? '-' : '+'}${String(Math.abs(n)).padStart(2, '0')}`;
    }
    const fixed = v.toFixed(Math.max(0, p - 1 - exp));
    return fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
}

/** Shortest %g representation that reads back to the same value. */
function shortestFloat(v: number, single: boolean): string {
    const max = single ? 9 : 17;
    for (let p = 1; p <= max; p++) {
        const s = formatG(v, p);
        const back = parseFloat(s);
        if ((single ? Math.fround(back) : back) === v || (isNaN(v) && isNaN(back))) return s;
    }
    return formatG(v, max);
}

function renderItem(f: Format, view: DataView, offset: number): string {
    const b = view.getUint8(offset);
    switch (f.kind) {
        case 'c':
            if (C_ESCAPES[b] !== undefined) return C_ESCAPES[b];
            if (b >= 32 && b < 127) return String.fromCharCode(b);
            return b.toString(8).padStart(3, '0');
        case 'a': {
            const c = b & 0x7f;
            if (c < 33) return NAMES[c];
            if (c === 127) return 'del';
            return String.fromCharCode(c);
        }
        case 'f':
            return shortestFloat(f.size === 4 ? view.getFloat32(offset, true) : view.getFloat64(offset, true), f.size === 4);
    }
    let v: bigint;
    switch (f.size) {
        case 1: v = f.kind === 'd' ? BigInt(view.getInt8(offset)) : BigInt(b); break;
        case 2: v = f.kind === 'd' ? BigInt(view.getInt16(offset, true)) : BigInt(view.getUint16(offset, true)); break;
        case 4: v = f.kind === 'd' ? BigInt(view.getInt32(offset, true)) : BigInt(view.getUint32(offset, true)); break;
        default: v = f.kind === 'd' ? view.getBigInt64(offset, true) : view.getBigUint64(offset, true);
    }
    if (f.kind === 'd' || f.kind === 'u') return v.toString(10);
    const digits = f.kind === 'o' ? Math.ceil((f.size * 8) / 3) : f.size * 2;
    return v.toString(f.kind === 'o' ? 8 : 16).padStart(digits, '0');
}

export class OdCommand implements ICommand {
    constructor(private fs?: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        try {
            return this.run(args, context, state);
        } catch (e: any) {
            if (!(e instanceof OdError)) throw e;
            return { output: '', stderr: `od: ${e.message}\n`, exitCode: 1, newState: state };
        }
    }

    private run(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        let radix = 'o' as 'o' | 'd' | 'x' | 'n';
        let skip = 0;
        let limit: number | undefined;
        let verbose = false;
        let lineBytes = 16;
        const formats: Format[] = [];
        const files: string[] = [];

        const take = (i: number, a: string, flag: string): [string, number] => {
            if (a.length > flag.length) return [a.substring(flag.length), i];
            if (i + 1 >= args.length) throw new OdError(`option requires an argument -- '${flag[1]}'`);
            return [args[i + 1], i + 1];
        };

        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            if (a === '--') { files.push(...args.slice(i + 1)); break; }
            if (!a.startsWith('-') || a === '-') { files.push(a); continue; }
            let v: string;
            switch (a[1]) {
                case 'A':
                    [v, i] = take(i, a, '-A');
                    if (!/^[doxn]$/.test(v)) throw new OdError(`invalid output address radix '${v}'; it must be one character from [doxn]`);
                    radix = v as typeof radix;
                    continue;
                case 'j': [v, i] = take(i, a, '-j'); skip = parseCount(v); continue;
                case 'N': [v, i] = take(i, a, '-N'); limit = parseCount(v); continue;
                case 't': [v, i] = take(i, a, '-t'); formats.push(...parseFormat(v)); continue;
                case 'w': lineBytes = a.length > 2 ? parseInt(a.substring(2), 10) : 32; continue;
            }
            for (const c of a.substring(1)) {
                const alias: Record<string, string> = { b: 'o1', c: 'c', d: 'u2', o: 'o2', s: 'd2', x: 'x2', i: 'dI', l: 'dL', f: 'fF', a: 'a', h: 'x2', B: 'o2', D: 'u4', O: 'o4', X: 'x4', e: 'fD', F: 'fD', I: 'dL', L: 'dL', H: 'x4' };
                if (c === 'v') { verbose = true; continue; }
                if (!alias[c]) throw new OdError(`invalid option -- '${c}'`);
                formats.push(...parseFormat(alias[c]));
            }
        }
        if (formats.length === 0) formats.push(...parseFormat('o2'));

        // Traditional offset operand: `od [file] [+]offset[.][b]` (XSI).
        const last = files[files.length - 1];
        const offsetRe = /^\+?(0[xX][0-9a-fA-F]+|[0-9]+)(\.?)(b?)$/;
        if (last !== undefined && (last.startsWith('+') || (files.length === 2 && /^[0-9]/.test(last))) && offsetRe.test(last)) {
            const m = offsetRe.exec(last)!;
            const base = /^0[xX]/.test(m[1]) ? 16 : m[2] === '.' ? 10 : 8;
            skip = parseInt(m[1], base) * (m[3] ? 512 : 1);
            files.pop();
        }

        // Read and concatenate inputs.
        const errors: string[] = [];
        const chunks: Uint8Array[] = [];
        for (const f of files.length ? files : ['-']) {
            const input = readInputBytes(context, f);
            if (!input.ok) { errors.push(`od: ${input.error}`); continue; }
            chunks.push(input.data);
        }
        if (chunks.length === 0) {
            return { output: '', stderr: errors.join('\n') + '\n', exitCode: 1, newState: state };
        }
        const total = chunks.reduce((n, c) => n + c.length, 0);
        const all = new Uint8Array(total);
        let p = 0;
        for (const c of chunks) { all.set(c, p); p += c.length; }
        if (skip > all.length) {
            return { output: '', stderr: 'od: cannot skip past end of combined input\n', exitCode: 1, newState: state };
        }
        const data = all.subarray(skip, limit !== undefined ? Math.min(all.length, skip + limit) : all.length);

        const maxSize = Math.max(...formats.map(f => f.size));
        if (lineBytes % maxSize !== 0) lineBytes = maxSize * Math.max(1, Math.round(lineBytes / maxSize));
        const lineWidth = Math.max(...formats.map(f => f.width * (lineBytes / f.size)));
        const addrWidth = radix === 'n' ? 0 : radix === 'x' ? 6 : 7;
        const addr = (n: number) => (radix === 'n' ? '' : n.toString(radix === 'o' ? 8 : radix === 'd' ? 10 : 16).padStart(addrWidth, '0'));

        let out = '';
        let prev: string | null = null;
        let starred = false;
        for (let off = 0; off < data.length; off += lineBytes) {
            const line = data.subarray(off, Math.min(off + lineBytes, data.length));
            const block = new Uint8Array(Math.ceil(line.length / maxSize) * maxSize);
            block.set(line);
            const view = new DataView(block.buffer);
            const key = Array.from(line).join(',');
            if (!verbose && line.length === lineBytes && key === prev) {
                if (!starred) out += '*\n';
                starred = true;
                continue;
            }
            prev = line.length === lineBytes ? key : null;
            starred = false;

            formats.forEach((f, idx) => {
                const fieldWidth = lineWidth / (lineBytes / f.size);
                let text = '';
                for (let i = 0; i < line.length; i += f.size) {
                    text += renderItem(f, view, i).padStart(Math.floor(fieldWidth));
                }
                out += (idx === 0 ? addr(skip + off) : ' '.repeat(addrWidth)) + text;
                if (f.text) {
                    const printable = Array.from(line).map(c => (c >= 32 && c < 127 ? String.fromCharCode(c) : '.')).join('');
                    out += ' '.repeat(Math.floor(fieldWidth) * ((lineBytes - line.length) / f.size)) + `  >${printable}<`;
                }
                out += '\n';
            });
        }
        if (radix !== 'n') out += addr(skip + data.length) + '\n';

        return {
            output: out,
            stderr: errors.length ? errors.join('\n') + '\n' : undefined,
            exitCode: errors.length ? 1 : 0,
            newState: state,
        };
    }
}
