/**
 * strings - find printable strings in files (POSIX): -a, -n number, -t d|o|x.
 * A string is at least `number` (default 4) printable characters (and tabs).
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { getopt, readInputBytes } from '../shared/InputFiles';

export class StringsCommand extends Utility {
    readonly utility = 'strings';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const normalized = args.map(a => (/^-[0-9]+$/.test(a) ? `-n${a.substring(1)}` : a === '-' ? '-a' : a));
        const { opts, operands, error } = getopt(normalized, 'an:t:e:fwo');
        if (error) return this.usage(state, error);
        const min = opts.has('n') ? Number(opts.get('n')) : 4;
        if (!Number.isInteger(min) || min < 1) return this.usage(state, `invalid minimum string length ${opts.get('n')}`);
        const radix = opts.has('o') ? 'o' : opts.has('t') ? String(opts.get('t')) : undefined;
        if (radix && !['d', 'o', 'x'].includes(radix)) return this.usage(state, `invalid radix ${radix}`);

        let out = '';
        const errors: string[] = [];
        for (const f of operands.length ? operands : ['-']) {
            const input = readInputBytes(context, f);
            if (!input.ok) { errors.push(input.error); continue; }
            const data = input.data;
            let start = -1;
            const flush = (end: number) => {
                if (start >= 0 && end - start >= min) {
                    const text = String.fromCharCode(...data.subarray(start, end));
                    const prefix = opts.has('f') ? `${f}: ` : '';
                    const off = radix ? start.toString(radix === 'd' ? 10 : radix === 'o' ? 8 : 16).padStart(7) + ' ' : '';
                    out += `${prefix}${off}${text}\n`;
                }
                start = -1;
            };
            for (let i = 0; i < data.length; i++) {
                const b = data[i];
                const printable = (b >= 32 && b < 127) || b === 9;
                if (printable) { if (start < 0) start = i; }
                else flush(i);
            }
            flush(data.length);
        }
        return this.respond(state, out, errors);
    }
}
