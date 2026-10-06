/**
 * expand - convert tabs to spaces (POSIX): -t tablist (n or n1,n2,...).
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { getopt, readInput } from '../shared/InputFiles';

/** Parses a POSIX tab list; returns stop positions (or a single repeating width). */
export function parseTabs(spec: string | undefined): { every?: number; stops?: number[] } | string {
    if (spec === undefined) return { every: 8 };
    const parts = spec.split(/[ ,]+/).filter(Boolean);
    if (!parts.every(p => /^[0-9]+$/.test(p))) return `tab size contains invalid character(s): '${spec}'`;
    const nums = parts.map(Number);
    if (nums.length === 1) return nums[0] === 0 ? 'tab size cannot be 0' : { every: nums[0] };
    for (let i = 1; i < nums.length; i++) if (nums[i] <= nums[i - 1]) return 'tab sizes must be ascending';
    return { stops: nums };
}

export function nextStop(col: number, tabs: { every?: number; stops?: number[] }): number {
    if (tabs.every) return col + tabs.every - (col % tabs.every);
    const stop = tabs.stops!.find(s => s > col);
    return stop ?? col + 1;
}

export class ExpandCommand extends Utility {
    readonly utility = 'expand';
    readonly capabilities = [CommandCapability.TRANSFORM];

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const normalized = args.map(a => (/^-[0-9][0-9,]*$/.test(a) ? `-t${a.substring(1)}` : a));
        const { opts, operands, error } = getopt(normalized, 't:i');
        if (error) return this.usage(state, error);
        const tabs = parseTabs(opts.get('t') as string | undefined);
        if (typeof tabs === 'string') return this.usage(state, tabs);

        let out = '';
        const errors: string[] = [];
        for (const f of operands.length ? operands : ['-']) {
            const input = readInput(context, f);
            if (!input.ok) { errors.push(input.error); continue; }
            for (const line of input.data.split(/(?<=\n)/)) {
                let col = 0;
                let leading = true;
                for (const ch of line) {
                    if (ch === '\t' && (leading || !opts.has('i'))) {
                        const to = nextStop(col, tabs);
                        out += ' '.repeat(to - col);
                        col = to;
                    } else if (ch === '\b') {
                        out += ch; col = Math.max(0, col - 1);
                    } else if (ch === '\n') {
                        out += ch; col = 0;
                    } else {
                        if (ch !== ' ' && ch !== '\t') leading = false;
                        out += ch; col++;
                    }
                }
            }
        }
        return this.respond(state, out, errors);
    }
}
