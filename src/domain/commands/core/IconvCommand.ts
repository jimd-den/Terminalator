/**
 * iconv - codeset conversion (POSIX): `iconv [-cs] -f from -t to [file...]`, `iconv -l`.
 * Supported: UTF-8, ISO-8859-1 (Latin-1), ASCII, UTF-16/UTF-16LE/UTF-16BE, UTF-32LE.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { readInputBytes } from '../shared/InputFiles';
import { bytesToBinaryString } from '../../services/shell/io/OutputSink';

const ALIASES: Record<string, string> = {
    'UTF-8': 'utf8', UTF8: 'utf8',
    'ISO-8859-1': 'latin1', ISO8859_1: 'latin1', 'ISO8859-1': 'latin1', 'ISO_8859-1': 'latin1', LATIN1: 'latin1', L1: 'latin1', CP819: 'latin1',
    ASCII: 'ascii', 'US-ASCII': 'ascii', 'ANSI_X3.4-1968': 'ascii', 646: 'ascii',
    'UTF-16': 'utf16', 'UTF-16LE': 'utf16le', 'UTF-16BE': 'utf16be', 'UTF-32LE': 'utf32le',
};

function codeset(name: string): { cs: string; ignore: boolean } | null {
    const [base, ...suffixes] = name.toUpperCase().split('//');
    const cs = ALIASES[base];
    return cs ? { cs, ignore: suffixes.includes('IGNORE') } : null;
}

function decode(bytes: Uint8Array, cs: string): { cps: number[]; bad: number } {
    const cps: number[] = [];
    let bad = -1;
    if (cs === 'latin1' || cs === 'ascii') {
        for (let i = 0; i < bytes.length; i++) {
            if (cs === 'ascii' && bytes[i] > 127 && bad < 0) bad = i;
            cps.push(bytes[i]);
        }
        return { cps, bad };
    }
    if (cs.startsWith('utf16') || cs === 'utf32le') {
        const le = cs !== 'utf16be';
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        if (cs === 'utf32le') { for (let i = 0; i + 3 < bytes.length; i += 4) cps.push(view.getUint32(i, true)); return { cps, bad }; }
        let start = 0;
        let little = le;
        if (cs === 'utf16' && bytes.length >= 2) {
            if (bytes[0] === 0xff && bytes[1] === 0xfe) { little = true; start = 2; }
            else if (bytes[0] === 0xfe && bytes[1] === 0xff) { little = false; start = 2; }
        }
        const units: number[] = [];
        for (let i = start; i + 1 < bytes.length; i += 2) units.push(view.getUint16(i, little));
        for (const ch of String.fromCharCode(...units)) cps.push(ch.codePointAt(0)!);
        return { cps, bad };
    }
    // UTF-8 (strict)
    for (let i = 0; i < bytes.length;) {
        const b = bytes[i];
        const n = b < 0x80 ? 1 : b >= 0xf0 && b < 0xf8 ? 4 : b >= 0xe0 ? 3 : b >= 0xc2 && b < 0xe0 ? 2 : 0;
        if (n === 0 || i + n > bytes.length) { if (bad < 0) bad = i; i++; continue; }
        let cp = n === 1 ? b : b & (0xff >> (n + 1));
        let ok = true;
        for (let k = 1; k < n; k++) {
            if ((bytes[i + k] & 0xc0) !== 0x80) { ok = false; break; }
            cp = (cp << 6) | (bytes[i + k] & 0x3f);
        }
        if (!ok) { if (bad < 0) bad = i; i++; continue; }
        cps.push(cp);
        i += n;
    }
    return { cps, bad };
}

function encode(cps: number[], cs: string, skip: boolean): { bytes: number[]; bad: number } {
    const out: number[] = [];
    let bad = -1;
    cps.forEach((cp, idx) => {
        if (cs === 'latin1' || cs === 'ascii') {
            if (cp > (cs === 'ascii' ? 127 : 255)) { if (!skip && bad < 0) bad = idx; return; }
            out.push(cp);
        } else if (cs === 'utf8') {
            out.push(...new TextEncoder().encode(String.fromCodePoint(cp)));
        } else if (cs === 'utf32le') {
            out.push(cp & 0xff, (cp >> 8) & 0xff, (cp >> 16) & 0xff, cp >>> 24);
        } else {
            const be = cs === 'utf16be';
            if (cs === 'utf16' && idx === 0) out.push(0xff, 0xfe);
            for (const unit of String.fromCodePoint(cp).split('').map(c => c.charCodeAt(0))) {
                out.push(...(be ? [unit >> 8, unit & 0xff] : [unit & 0xff, unit >> 8]));
            }
        }
    });
    return { bytes: out, bad };
}

export class IconvCommand extends Utility {
    readonly utility = 'iconv';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        let from: string | undefined, to: string | undefined;
        let skip = false;
        let outputFile: string | undefined;
        const files: string[] = [];
        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            if (a === '-l' || a === '--list') return this.respond(state, Object.keys(ALIASES).join('\n') + '\n');
            if (a === '-c') { skip = true; continue; }
            if (a === '-s') continue;
            if (a === '-o') { outputFile = args[++i]; continue; }
            if (a.startsWith('--output=')) { outputFile = a.split('=')[1]; continue; }
            if (a === '-f') { from = args[++i]; continue; }
            if (a === '-t') { to = args[++i]; continue; }
            if (a.startsWith('-f')) { from = a.substring(2); continue; }
            if (a.startsWith('-t')) { to = a.substring(2); continue; }
            if (a.startsWith('--from-code=')) { from = a.split('=')[1]; continue; }
            if (a.startsWith('--to-code=')) { to = a.split('=')[1]; continue; }
            files.push(a);
        }
        const locale = 'UTF-8';
        const f = codeset(from ?? locale), t = codeset(to ?? locale);
        if (!f || !t) {
            const which = !f && !t ? `from '${from}' to '${to}'` : !f ? `from '${from}'` : `to '${to}'`;
            return this.usage(state, `conversion ${which} unsupported`);
        }
        skip ||= t.ignore;
        let out = '';
        const errors: string[] = [];
        let status = 0;
        for (const file of files.length ? files : ['-']) {
            const input = readInputBytes(context, file);
            if (!input.ok) { errors.push(input.error); status = 1; continue; }
            const dec = decode(input.data, f.cs);
            const enc = encode(dec.cps, t.cs, skip);
            out += bytesToBinaryString(Uint8Array.from(enc.bytes));
            if (dec.bad >= 0 && !skip) { errors.push(`illegal input sequence at position ${dec.bad}`); status = 1; break; }
            if (enc.bad >= 0) { errors.push(`cannot convert`); status = 1; break; }
        }
        if (outputFile !== undefined) {
            const fsys = context.fileSystemService;
            fsys.writeFile(fsys.resolveAbsolutePath(outputFile, context.cwd), Uint8Array.from(out, c => c.charCodeAt(0)), 'w', undefined, undefined, '/');
            return this.respond(state, '', errors, status);
        }
        return this.respond(state, out, errors, status, true);
    }
}
