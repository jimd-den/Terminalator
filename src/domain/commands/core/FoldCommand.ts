/**
 * fold - filter for folding lines (POSIX): -b (count bytes), -s (break at
 * blanks), -w width (default 80).
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { getopt, readInput } from '../shared/InputFiles';

export class FoldCommand extends Utility {
    readonly utility = 'fold';
    readonly capabilities = [CommandCapability.TRANSFORM];

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const normalized = args.map(a => (/^-[0-9]+$/.test(a) ? `-w${a.substring(1)}` : a));
        const { opts, operands, error } = getopt(normalized, 'bsw:');
        if (error) return this.usage(state, error);
        const width = opts.has('w') ? Number(opts.get('w')) : 80;
        if (!Number.isInteger(width) || width < 1) return this.usage(state, `invalid number of columns: '${opts.get('w')}'`);

        let out = '';
        const errors: string[] = [];
        for (const f of operands.length ? operands : ['-']) {
            const input = readInput(context, f);
            if (!input.ok) { errors.push(input.error); continue; }
            for (const line of input.data.split(/(?<=\n)/)) out += this.fold(line, width, opts.has('b'), opts.has('s'));
        }
        return this.respond(state, out, errors);
    }

    private fold(line: string, width: number, bytes: boolean, spaces: boolean): string {
        const hasNl = line.endsWith('\n');
        const text = hasNl ? line.slice(0, -1) : line;
        let out = '';
        let cur = '';
        let col = 0;
        const advance = (c: string, at: number) => {
            if (bytes) return at + 1;
            if (c === '\t') return at + 8 - (at % 8);
            if (c === '\b') return Math.max(0, at - 1);
            if (c === '\r') return 0;
            return at + 1;
        };
        for (const ch of text) {
            const next = advance(ch, col);
            if (next > width && cur !== '') {
                let breakAt = -1;
                if (spaces) {
                    for (let i = cur.length - 1; i >= 0; i--) if (cur[i] === ' ' || cur[i] === '\t') { breakAt = i; break; }
                }
                if (breakAt >= 0) {
                    out += cur.substring(0, breakAt + 1) + '\n';
                    cur = cur.substring(breakAt + 1);
                } else {
                    out += cur + '\n';
                    cur = '';
                }
                col = 0;
                for (const c of cur) col = advance(c, col);
            }
            cur += ch;
            col = advance(ch, col);
        }
        return out + cur + (hasNl ? '\n' : '');
    }
}
