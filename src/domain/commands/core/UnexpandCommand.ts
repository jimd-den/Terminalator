/**
 * unexpand - convert spaces to tabs (POSIX): -a (all blanks), -t tablist.
 * By default only leading blanks are converted (-t implies -a).
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { getopt, readInput } from '../shared/InputFiles';
import { nextStop, parseTabs } from './ExpandCommand';

export class UnexpandCommand extends Utility {
    readonly utility = 'unexpand';
    readonly capabilities = [CommandCapability.TRANSFORM];

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'at:');
        if (error) return this.usage(state, error);
        const tabs = parseTabs(opts.get('t') as string | undefined);
        if (typeof tabs === 'string') return this.usage(state, tabs);
        const all = opts.has('a') || opts.has('t');

        let out = '';
        const errors: string[] = [];
        for (const f of operands.length ? operands : ['-']) {
            const input = readInput(context, f);
            if (!input.ok) { errors.push(input.error); continue; }
            for (const line of input.data.split(/(?<=\n)/)) out += this.convert(line, tabs, all);
        }
        return this.respond(state, out, errors);
    }

    private convert(line: string, tabs: { every?: number; stops?: number[] }, all: boolean): string {
        let out = '';
        let col = 0;
        let pending = ''; // blanks not yet emitted
        let pendingStart = 0;
        let leading = true;
        const lastStop = tabs.stops ? tabs.stops[tabs.stops.length - 1] : Infinity;

        for (const ch of line) {
            const active = leading || all;
            if ((ch === ' ' || ch === '\t') && active && col < lastStop) {
                if (pending === '') pendingStart = col;
                const to = ch === '\t' ? nextStop(col, tabs) : col + 1;
                pending += ch;
                col = to;
                const stop = nextStop(pendingStart, tabs);
                if (col >= stop && (pending.length > 1 || ch === '\t')) {
                    // Blanks reached a tab stop: one tab replaces them.
                    out += '\t';
                    pending = '';
                    pendingStart = col;
                    // Any further stops covered by this run produce more tabs.
                } else if (col >= stop) {
                    out += pending;
                    pending = '';
                }
                continue;
            }
            out += pending;
            pending = '';
            if (ch === '\n') { out += ch; col = 0; leading = true; continue; }
            if (ch === '\b') col = Math.max(0, col - 1); else col++;
            leading = false;
            out += ch;
        }
        return out + pending;
    }
}
