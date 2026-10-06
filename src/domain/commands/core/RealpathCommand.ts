/**
 * realpath - print the resolved absolute path (POSIX 2024 / GNU):
 * `realpath [-e|-m] [-q] [-s] [-z] file...`
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { getopt } from '../shared/InputFiles';
import { canonicalize } from '../shared/PathOps';

/** Path of `to` relative to directory `from` (both absolute). */
export function relative(from: string, to: string): string {
    const a = from.split('/').filter(Boolean), b = to.split('/').filter(Boolean);
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    const parts = [...Array(a.length - i).fill('..'), ...b.slice(i)];
    return parts.length ? parts.join('/') : '.';
}

export class RealpathCommand extends Utility {
    readonly utility = 'realpath';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        let relativeTo: string | undefined, relativeBase: string | undefined;
        args = args.filter(a => {
            if (a.startsWith('--relative-to=')) { relativeTo = a.substring(14); return false; }
            if (a.startsWith('--relative-base=')) { relativeBase = a.substring(16); return false; }
            return true;
        });
        const { opts, operands, error } = getopt(args, 'emqszEPL');
        if (error) return this.usage(state, error);
        if (!operands.length) return this.usage(state, 'missing operand');
        const mode = opts.has('e') ? 'e' : opts.has('m') ? 'm' : 'f';
        let out = '';
        const errors: string[] = [];
        for (const file of operands) {
            const result = canonicalize(context, file, mode, !opts.has('s'));
            if (result === null) {
                if (!opts.has('q')) errors.push(`${file}: No such file or directory`);
                else errors.push('');
                continue;
            }
            let shown = result;
            const base = relativeTo ?? relativeBase;
            if (base !== undefined) {
                const b = canonicalize(context, base, 'm', !opts.has('s')) ?? base;
                if (relativeTo !== undefined || result === b || result.startsWith(b === '/' ? '/' : b + '/')) shown = relative(b, result);
            }
            out += shown + (opts.has('z') ? '\0' : '\n');
        }
        const shown = errors.filter(Boolean);
        return this.respond(state, out, shown, errors.length ? 1 : 0);
    }
}
