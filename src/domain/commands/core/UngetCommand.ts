/**
 * unget - undo a previous get of an SCCS file (POSIX):
 *   unget [-ns] [-r SID] file...
 *
 * Cancels the invoking user's pending edit (from `get -e`): removes its
 * p-file entry and, unless -n, the g-file. -r names the edit (by the SID
 * of the new delta) when the user has several; the SID is written to
 * standard output unless -s.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { Sid } from './sccs/Sid';
import { SccsEnv, sccsOptions, optValue } from './sccs/SccsSupport';
import { SccsReport } from './sccs/SccsReport';

export class UngetCommand extends Utility {
    readonly utility = 'unget';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const o = sccsOptions(args, 'r:ns');
        if (o.error) return this.usage(state, o.error);
        if (!o.operands.length) return this.usage(state, 'missing file operand');
        const rText = optValue(o, 'r');
        const want = rText !== undefined ? Sid.parse(rText) : null;
        if (rText !== undefined && !want) return this.usage(state, `invalid SID '${rText}'`);
        const env = new SccsEnv(context, state);
        const report = new SccsReport(this.utility);
        const files = env.expand(o.operands);
        for (const path of files) {
            const loaded = env.load(path);
            if (!loaded.ok) { report.error(loaded.error); continue; }
            const entries = env.pEntries(path);
            const mine = entries.filter(p => p.user === env.user && (!want || p.next.equals(want)));
            if (!mine.length) { report.error(`${path}: ${want ? `SID ${want} is` : 'No SID is'} not locked for editing by you (${env.user}).`); continue; }
            if (mine.length > 1) { report.error(`${path}: Specified SID is ambiguous; use -r.`); continue; }
            const err = env.savePEntries(path, entries.filter(p => p !== mine[0]));
            if (err) { report.error(err); continue; }
            if (files.length > 1 && !o.opts.has('s')) report.out += `\n${path}:\n`;
            if (!o.opts.has('s')) report.out += `${mine[0].next}\n`;
            const gname = SccsEnv.gName(path);
            if (!o.opts.has('n') && env.exists(gname)) {
                const rm = env.remove(gname);
                if (rm) report.error(rm);
            }
        }
        return report.response(state);
    }
}
