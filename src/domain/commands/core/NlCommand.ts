/**
 * nl - line numbering filter (POSIX). Logical pages are split into header,
 * body and footer sections by the delimiter lines \:\:\:, \:\: and \:.
 *   -b|-f|-h type (a, t, n, pBRE), -d delim, -i incr, -l num, -n ln|rn|rz,
 *   -p, -s sep, -v start, -w width
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { getopt, readInput } from '../shared/InputFiles';
import { compilePosixRegex } from '../../utils/PosixRegex';

type Style = { kind: 'a' | 't' | 'n' } | { kind: 'p'; re: RegExp };

export class NlCommand extends Utility {
    readonly utility = 'nl';
    readonly capabilities = [CommandCapability.TRANSFORM];

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'b:d:f:h:i:l:n:ps:v:w:');
        if (error) return this.usage(state, error);
        const style = (key: string, dflt: string): Style | string => {
            const v = String(opts.get(key) ?? dflt);
            if (v === 'a' || v === 't' || v === 'n') return { kind: v };
            if (v.startsWith('p')) {
                try { return { kind: 'p', re: compilePosixRegex(v.substring(1)) }; } catch { return `invalid regular expression: ${v.substring(1)}`; }
            }
            return `invalid ${key === 'b' ? 'body' : key === 'h' ? 'header' : 'footer'} numbering style: '${v}'`;
        };
        const styles = { header: style('h', 'n'), body: style('b', 't'), footer: style('f', 'n') };
        for (const s of Object.values(styles)) if (typeof s === 'string') return this.usage(state, s);
        const num = (key: string, dflt: number, min: number): number | string => {
            const v = opts.get(key);
            if (v === undefined) return dflt;
            if (!/^-?[0-9]+$/.test(String(v)) || parseInt(String(v), 10) < min) return `invalid option argument '${v}'`;
            return parseInt(String(v), 10);
        };
        const incr = num('i', 1, 0), join = num('l', 1, 1), start = num('v', 1, -Infinity), width = num('w', 6, 1);
        for (const n of [incr, join, start, width]) if (typeof n === 'string') return this.usage(state, n);
        const format = String(opts.get('n') ?? 'rn');
        if (!['ln', 'rn', 'rz'].includes(format)) return this.usage(state, `invalid line numbering format: '${format}'`);
        const sep = opts.has('s') ? String(opts.get('s')) : '\t';
        let delim = opts.has('d') ? String(opts.get('d')) : '\\:';
        if (delim.length === 1) delim += ':';

        const input = readInput(context, operands[0]);
        if (!input.ok) return this.respond(state, '', [input.error]);

        let section: keyof typeof styles = 'body';
        let n = start as number;
        let blankRun = 0;
        let out = '';
        const fmt = (v: number) => {
            const w = width as number;
            if (format === 'ln') return String(v).padEnd(w);
            if (format === 'rz') return (v < 0 ? '-' + String(-v).padStart(w - 1, '0') : String(v).padStart(w, '0'));
            return String(v).padStart(w);
        };

        const lines = input.data.match(/[^\n]*\n|[^\n]+$/g) ?? [];
        for (const raw of lines) {
            const text = raw.replace(/\n$/, '');
            if (text === delim.repeat(3) || text === delim.repeat(2) || text === delim) {
                section = text === delim.repeat(3) ? 'header' : text === delim.repeat(2) ? 'body' : 'footer';
                if (!opts.has('p')) n = start as number;
                out += '\n';
                continue;
            }
            const st = styles[section] as Style;
            let number = false;
            if (st.kind === 'a') {
                if (text === '') {
                    blankRun++;
                    number = blankRun >= (join as number);
                    if (number) blankRun = 0;
                } else { blankRun = 0; number = true; }
            } else if (st.kind === 't') number = text !== '';
            else if (st.kind === 'p') number = st.re.test(text);
            if (number) {
                out += fmt(n) + sep + raw;
                n += incr as number;
            } else {
                out += ' '.repeat((width as number) + sep.length) + raw;
            }
            if (!raw.endsWith('\n')) out += '\n';
        }
        return this.respond(state, out);
    }
}
