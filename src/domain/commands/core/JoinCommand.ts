/**
 * join - relational database operator (POSIX):
 * `join [-a 1|2] [-e string] [-o list] [-t char] [-v 1|2] [-1 field] [-2 field] file1 file2`
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { readInput } from '../shared/InputFiles';

type Spec = { file: 0 | 1 | 2; field: number };

export class JoinCommand extends Utility {
    readonly utility = 'join';
    readonly capabilities = [CommandCapability.TRANSFORM];

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const unpaired = new Set<number>();
        const only = new Set<number>();
        let empty: string | undefined;
        let format: Spec[] | undefined;
        let sep: string | undefined;
        let ignoreCase = false;
        const field = [1, 1];
        const operands: string[] = [];

        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            const val = () => (a.length > 2 ? a.substring(2) : args[++i]);
            if (a === '--') { operands.push(...args.slice(i + 1)); break; }
            if (!a.startsWith('-') || a === '-') { operands.push(a); continue; }
            switch (a[1]) {
                case 'i': ignoreCase = true; break;
                case 'a': unpaired.add(Number(val())); break;
                case 'v': only.add(Number(val())); break;
                case 'e': empty = val(); break;
                case 't': sep = val(); break;
                case '1': field[0] = Number(val()); break;
                case '2': field[1] = Number(val()); break;
                case 'j': field[0] = field[1] = Number(val()); break;
                case 'o': {
                    const list: string[] = [val()];
                    while (args[i + 1] !== undefined && /^(0|[12]\.[0-9]+)([, ]|$)/.test(args[i + 1]) && operands.length + (args.length - i - 1) > 2) list.push(args[++i]);
                    format = list.join(',').split(/[, ]+/).filter(Boolean).map(s => {
                        if (s === '0') return { file: 0, field: 0 } as Spec;
                        const m = /^([12])\.([0-9]+)$/.exec(s);
                        if (!m) throw new Error(`invalid field specifier: '${s}'`);
                        return { file: Number(m[1]) as 1 | 2, field: Number(m[2]) };
                    });
                    break;
                }
                default: return this.usage(state, `invalid option -- '${a[1]}'`);
            }
        }
        if (operands.length !== 2) return this.usage(state, operands.length < 2 ? 'missing operand' : `extra operand '${operands[2]}'`);

        const read = (f: string) => readInput(context, f);
        const r1 = read(operands[0]);
        const r2 = operands[1] === '-' && operands[0] === '-' ? r1 : read(operands[1]);
        if (!r1.ok) return this.respond(state, '', [r1.error]);
        if (!r2.ok) return this.respond(state, '', [r2.error]);

        const split = (line: string) => (sep !== undefined ? line.split(sep) : line.trim().split(/[ \t]+/));
        const rows = (data: string) => data.split('\n').filter((l, k, all) => k < all.length - 1 || l !== '').map(split);
        const a = rows(r1.data), b = rows(r2.data);
        const key = (row: string[], n: number) => {
            const k = row[field[n] - 1] ?? '';
            return ignoreCase ? k.toLowerCase() : k;
        };
        const outSep = sep ?? ' ';

        const render = (x: string[] | null, y: string[] | null): string => {
            const k = x ? x[field[0] - 1] ?? '' : y![field[1] - 1] ?? '';
            if (format) {
                return format.map(s => {
                    if (s.file === 0) return k;
                    const row = s.file === 1 ? x : y;
                    const v = row ? row[s.field - 1] : undefined;
                    return v === undefined ? empty ?? '' : v;
                }).join(outSep);
            }
            const rest = (row: string[] | null, n: number) => (row ? row.filter((_, i) => i !== field[n] - 1) : []);
            return [k, ...rest(x, 0), ...rest(y, 1)].map(v => (v === '' && empty !== undefined ? empty : v)).join(outSep);
        };

        let out = '';
        let i = 0, j = 0;
        const printA = unpaired.has(1) || only.has(1);
        const printB = unpaired.has(2) || only.has(2);
        const showPairs = only.size === 0;
        while (i < a.length || j < b.length) {
            const ka = i < a.length ? key(a[i], 0) : null;
            const kb = j < b.length ? key(b[j], 1) : null;
            if (kb === null || (ka !== null && ka < kb)) { if (printA) out += render(a[i], null) + '\n'; i++; continue; }
            if (ka === null || kb < ka) { if (printB) out += render(null, b[j]) + '\n'; j++; continue; }
            // Equal keys: cartesian product of the runs.
            let i2 = i; while (i2 < a.length && key(a[i2], 0) === ka) i2++;
            let j2 = j; while (j2 < b.length && key(b[j2], 1) === kb) j2++;
            if (showPairs) for (let x = i; x < i2; x++) for (let y = j; y < j2; y++) out += render(a[x], b[y]) + '\n';
            i = i2; j = j2;
        }
        return this.respond(state, out);
    }
}
