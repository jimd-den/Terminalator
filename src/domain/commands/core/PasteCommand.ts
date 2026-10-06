/** paste - merge corresponding or subsequent lines of files (POSIX): `paste [-s] [-d list] file...` */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { getopt, readInput } from '../shared/InputFiles';

export function parseDelimiters(spec: string): string[] {
    const out: string[] = [];
    for (let i = 0; i < spec.length; i++) {
        if (spec[i] !== '\\') { out.push(spec[i]); continue; }
        const n = spec[++i];
        out.push(n === 'n' ? '\n' : n === 't' ? '\t' : n === '0' ? '' : n === '\\' ? '\\' : n ?? '\\');
    }
    return out;
}

export class PasteCommand extends Utility {
    readonly utility = 'paste';
    readonly capabilities = [CommandCapability.TRANSFORM];

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'sd:');
        if (error) return this.usage(state, error);
        const delims = opts.has('d') ? parseDelimiters(String(opts.get('d'))) : ['\t'];
        if (delims.length === 0) return this.usage(state, 'delimiter list ends with an unescaped backslash');
        const files = operands.length ? operands : ['-'];

        // Every '-' operand reads successive lines from the one standard input.
        let stdinLines: string[] | null = null;
        const sources: string[][] = [];
        const errors: string[] = [];
        let stdinPos = 0;
        const stdinCursor = { next: () => (stdinLines && stdinPos < stdinLines.length ? stdinLines[stdinPos++] : undefined) };
        for (const f of files) {
            if (f === '-') {
                if (stdinLines === null) {
                    const r = readInput(context, '-');
                    stdinLines = r.ok ? this.lines(r.data) : [];
                }
                sources.push([]);
                continue;
            }
            const r = readInput(context, f);
            if (!r.ok) { errors.push(r.error); return this.respond(state, '', errors); }
            sources.push(this.lines(r.data));
        }

        let out = '';
        if (opts.has('s')) {
            files.forEach((f, idx) => {
                const ls = f === '-' ? stdinLines!.splice(0) : sources[idx];
                let line = '';
                ls.forEach((l, k) => { line += (k ? delims[(k - 1) % delims.length] : '') + l; });
                out += line + '\n';
            });
            return this.respond(state, out, errors);
        }

        const pos = files.map(() => 0);
        while (true) {
            let any = false;
            const cols: string[] = files.map((f, idx) => {
                if (f === '-') {
                    const l = stdinCursor.next();
                    if (l !== undefined) any = true;
                    return l ?? '';
                }
                const l = sources[idx][pos[idx]++];
                if (l !== undefined) any = true;
                return l ?? '';
            });
            if (!any) break;
            let line = '';
            cols.forEach((c, k) => { line += (k ? delims[(k - 1) % delims.length] : '') + c; });
            out += line + '\n';
        }
        return this.respond(state, out, errors);
    }

    private lines(data: string): string[] {
        const ls = data.split('\n');
        if (ls[ls.length - 1] === '') ls.pop();
        return ls;
    }
}
