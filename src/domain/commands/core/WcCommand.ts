/**
 * wc - word, line and byte or character count (POSIX): -c -l -m -w.
 * Output columns follow GNU's layout.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { getopt, readInputBytes } from '../shared/InputFiles';
import { statPath } from '../shared/FileInfo';
import { isUtf8Locale } from '../shared/Locale';
import { regularFileSize } from '../../services/shell/io/IOContext';

interface Counts { lines: number; words: number; chars: number; bytes: number; }

export function countText(bytes: Uint8Array, utf8 = true): Counts {
    let lines = 0, words = 0, inWord = false;
    for (const b of bytes) {
        if (b === 10) lines++;
        const space = b === 32 || (b >= 9 && b <= 13);
        if (space) inWord = false;
        else if (!inWord) { inWord = true; words++; }
    }
    let chars = 0;
    if (!utf8) chars = bytes.length;
    else for (const b of bytes) if ((b & 0xc0) !== 0x80) chars++;
    return { lines, words, chars, bytes: bytes.length };
}

export class WcCommand extends Utility {
    readonly utility = 'wc';
    readonly capabilities = [CommandCapability.READ, CommandCapability.FILTER];

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'clmwL');
        if (error) return this.usage(state, error);
        let show = { lines: opts.has('l'), words: opts.has('w'), chars: opts.has('m'), bytes: opts.has('c') };
        if (!show.lines && !show.words && !show.chars && !show.bytes) show = { lines: true, words: true, chars: false, bytes: true };

        const files = operands.length ? operands : [undefined];
        const results: { name?: string; c: Counts }[] = [];
        const errors: string[] = [];
        let sizeHint = 0;
        let nonRegular = false;
        for (const f of files) {
            const input = readInputBytes(context, f);
            if (!input.ok) { errors.push(input.error); continue; }
            const info = f && f !== '-' ? statPath(context, f) : null;
            const stdinFile = !f || f === '-' ? regularFileSize(context.stdin) : undefined;
            if (info?.kind === 'regular') sizeHint += info.inode.size;
            else if (stdinFile !== undefined) sizeHint += stdinFile;
            else nonRegular = true;
            results.push({ name: f, c: countText(input.data, isUtf8Locale(context.env)) });
        }
        if (results.length > 1 || (results.length && operands.length > 1)) {
            const t = results.reduce((a, r) => ({
                lines: a.lines + r.c.lines, words: a.words + r.c.words, chars: a.chars + r.c.chars, bytes: a.bytes + r.c.bytes,
            }), { lines: 0, words: 0, chars: 0, bytes: 0 });
            if (operands.length > 1) results.push({ name: 'total', c: t });
        }

        const fields = (['lines', 'words', 'chars', 'bytes'] as const).filter(k => show[k]);
        const single = fields.length === 1 && files.length === 1;
        let width = single ? 1 : Math.max(1, String(sizeHint).length);
        if (!single && nonRegular) width = Math.max(width, 7);

        const out = results.map(r => {
            const nums = fields.map(k => String(r.c[k]).padStart(width)).join(' ');
            return r.name !== undefined ? `${nums} ${r.name}` : nums;
        }).join('\n');
        return this.respond(state, out ? out + '\n' : '', errors);
    }
}
