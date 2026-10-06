/**
 * cmp - compare two files (POSIX): `cmp [-l|-s] file1 file2 [skip1 [skip2]]`,
 * plus GNU -n limit and -i skip. Exit 0 identical, 1 different, 2 trouble.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { getopt, readInputBytes } from '../shared/InputFiles';
import { isUtf8Locale } from '../shared/Locale';

function parseSkip(s: string): number | null {
    const m = /^(0[xX][0-9a-fA-F]+|0[0-7]*|[1-9][0-9]*)([kKMG]?|kB|MB)$/.exec(s);
    if (!m) return null;
    const n = /^0[xX]/.test(m[1]) ? parseInt(m[1], 16) : m[1].length > 1 && m[1][0] === '0' ? parseInt(m[1], 8) : parseInt(m[1], 10);
    return n * ({ '': 1, k: 1024, K: 1024, M: 1 << 20, G: 1 << 30, kB: 1000, MB: 1e6 } as Record<string, number>)[m[2]];
}

/** POSIX requires "char" in the POSIX locale; GNU says "byte" elsewhere. */
function charWord(context: ProcessContext): string {
    return isUtf8Locale(context.env) ? 'byte' : 'char';
}

export class CmpCommand extends Utility {
    readonly utility = 'cmp';
    readonly capabilities = [CommandCapability.READ];

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'lsbn:i:');
        if (error) return this.usage(state, error, 2);
        if (opts.has('l') && opts.has('s')) return this.usage(state, 'options -l and -s are incompatible', 2);
        if (operands.length < 2) return this.usage(state, operands.length ? `missing operand after '${operands[0]}'` : 'missing operand', 2);
        if (operands.length > 4) return this.usage(state, `invalid --ignore-initial value '${operands[4]}'`, 2);

        const skips = [0, 0];
        if (opts.has('i')) {
            const [a, b = a] = String(opts.get('i')).split(':');
            skips[0] = parseSkip(a) ?? NaN;
            skips[1] = parseSkip(b) ?? NaN;
        }
        if (operands[2] !== undefined) skips[0] = parseSkip(operands[2]) ?? NaN;
        if (operands[3] !== undefined) skips[1] = parseSkip(operands[3]) ?? NaN;
        if (skips.some(isNaN)) return this.usage(state, 'invalid skip value', 2);
        const limit = opts.has('n') ? parseSkip(String(opts.get('n'))) : null;

        const [n1, n2] = operands;
        const a = readInputBytes(context, n1);
        const b = readInputBytes(context, n2);
        if (!a.ok) return this.respond(state, '', [a.error], 2);
        if (!b.ok) return this.respond(state, '', [b.error], 2);

        const x = a.data.subarray(Math.min(skips[0], a.data.length));
        const y = b.data.subarray(Math.min(skips[1], b.data.length));
        const span = Math.min(x.length, y.length, limit ?? Infinity);
        const silent = opts.has('s');
        const name = (n: string) => (n === '-' ? '-' : n);

        let line = 1;
        let out = '';
        let differ = false;
        for (let i = 0; i < span; i++) {
            if (x[i] !== y[i]) {
                differ = true;
                if (silent) return this.respond(state, '', [], 1);
                if (!opts.has('l')) {
                    return this.respond(state, `${name(n1)} ${name(n2)} differ: ${charWord(context)} ${i + 1}, line ${line}\n`, [], 1);
                }
                out += `${i + 1} ${x[i].toString(8)} ${y[i].toString(8)}\n`;
            }
            if (x[i] === 10) line++;
        }

        const limited = limit !== null && span >= limit;
        if (!limited && x.length !== y.length) {
            if (silent) return this.respond(state, '', [], 1);
            const shorter = x.length < y.length ? n1 : n2;
            const len = Math.min(x.length, y.length);
            const where = len === 0 ? 'which is empty' : `after byte ${len}${opts.has('l') ? '' : `, in line ${line - (x[len - 1] === 10 ? 1 : 0)}`}`;
            return this.respond(state, out, [`EOF on ${name(shorter)} ${where}`], 1);
        }
        return this.respond(state, out, [], differ ? 1 : 0);
    }
}
