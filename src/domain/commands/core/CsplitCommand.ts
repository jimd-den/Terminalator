/**
 * csplit - split files based on context (POSIX):
 * `csplit [-ks] [-f prefix] [-n number] file arg...` where each arg is a
 * line number, /re/[offset], %re%[offset], {num} or (GNU) {*}; -z (GNU)
 * suppresses empty output files.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { getopt, readInput } from '../shared/InputFiles';
import { compilePosixRegex } from '../../utils/PosixRegex';

type Arg = { kind: 'line'; n: number; raw: string } | { kind: 're' | 'skip'; re: RegExp; offset: number; raw: string };

class CsplitError extends Error { }

export class CsplitCommand extends Utility {
    readonly utility = 'csplit';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'ksf:n:z');
        if (error) return this.usage(state, error);
        if (operands.length < 2) return this.usage(state, operands.length ? `missing operand after '${operands[0]}'` : 'missing operand');
        const prefix = String(opts.get('f') ?? 'xx');
        const digits = opts.has('n') ? Number(opts.get('n')) : 2;
        if (!Number.isInteger(digits) || digits < 1) return this.usage(state, `invalid number: '${opts.get('n')}'`);

        const input = readInput(context, operands[0]);
        if (!input.ok) return this.usage(state, `cannot open '${operands[0]}' for reading: ${input.error.split(': ').pop()}`);
        const lines = input.data.match(/[^\n]*\n|[^\n]+$/g) ?? [];

        const fs = context.fileSystemService;
        const created: string[] = [];
        let out = '';
        const warnings: string[] = [];
        let fileNo = 0;
        const emit = (chunk: string[]) => {
            const text = chunk.join('');
            if (opts.has('z') && text === '') return;
            const name = prefix + String(fileNo++).padStart(digits, '0');
            fs.writeFile(fs.resolveAbsolutePath(name, context.cwd), text, 'w', undefined, undefined, '/');
            created.push(name);
            if (!opts.has('s')) out += `${new TextEncoder().encode(text).length}\n`;
        };
        const cleanup = (msg: string): CommandResponse => {
            if (!opts.has('k')) for (const f of created) { try { fs.deleteNode(fs.resolveAbsolutePath(f, context.cwd), '/'); } catch { /* gone */ } }
            return this.respond(state, out, [...warnings, msg], 1);
        };

        // Patterns, each optionally followed by a {num} / {*} repeat operand.
        const raw = operands.slice(1);
        const parsed: { arg: Arg; repeat?: string }[] = [];
        try {
            for (let k = 0; k < raw.length; k++) {
                if (/^\{(\*|[0-9]+)\}$/.test(raw[k])) {
                    if (!parsed.length) return this.usage(state, `'${raw[k]}': repeat count without a pattern`);
                    parsed[parsed.length - 1].repeat = raw[k];
                    continue;
                }
                parsed.push({ arg: this.parseArg(raw[k]) });
            }
        } catch (e: any) {
            return this.usage(state, e.message);
        }

        let start = 0; // index of the first line of the next file
        let anySplit = false;
        let lastLine = 0;
        for (const { arg, repeat: rep } of parsed) {
            const forever = rep === '{*}';
            const repeat = rep === undefined ? 1 : forever ? Infinity : parseInt(rep.slice(1, -1), 10) + 1;
            if (arg.kind === 'line' && forever) return this.usage(state, `'${rep}': integer required between '{' and '}'`);
            for (let r = 0; r < repeat; r++) {
                if (arg.kind === 'line') {
                    const n = arg.n + r * arg.n;
                    if (n - 1 > lines.length) {
                        emit(lines.slice(start));
                        start = lines.length;
                        return cleanup(`'${arg.raw}': line number out of range${r ? ` on repetition ${r}` : ''}`);
                    }
                    if (n - 1 < start) return cleanup(`'${arg.raw}': line number out of range`);
                    if (anySplit && n === lastLine) warnings.push(`warning: line number '${arg.raw}' is the same as preceding line number`);
                    emit(lines.slice(start, n - 1));
                    start = n - 1;
                    lastLine = n;
                } else {
                    let found = -1;
                    for (let k = anySplit ? start + 1 : start; k < lines.length; k++) {
                        arg.re.lastIndex = 0;
                        if (arg.re.test(lines[k].replace(/\n$/, ''))) { found = k; break; }
                    }
                    if (found < 0) {
                        if (forever) break;
                        emit(lines.slice(start));
                        start = lines.length;
                        return cleanup(`'${arg.raw}': match not found${r ? ` on repetition ${r}` : ''}`);
                    }
                    const at = Math.min(Math.max(found + arg.offset, start), lines.length);
                    if (arg.kind === 're') emit(lines.slice(start, at));
                    start = at;
                }
                anySplit = true;
            }
        }
        emit(lines.slice(start));
        return this.respond(state, out, warnings, 0);
    }

    private parseArg(raw: string): Arg {
        if (/^[0-9]+$/.test(raw)) {
            const n = parseInt(raw, 10);
            if (n === 0) throw new CsplitError(`'${raw}': line number must be greater than zero`);
            return { kind: 'line', n, raw };
        }
        const m = /^([\/%])(.*)\1([-+]?[0-9]+)?$/s.exec(raw);
        if (!m) throw new CsplitError(`'${raw}': invalid pattern`);
        return { kind: m[1] === '/' ? 're' : 'skip', re: compilePosixRegex(m[2]), offset: m[3] ? parseInt(m[3], 10) : 0, raw };
    }
}
