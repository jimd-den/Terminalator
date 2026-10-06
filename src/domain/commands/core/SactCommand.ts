/**
 * sact - print current SCCS file-editing activity (POSIX): `sact file...`
 *
 * For each s-file with pending edits (`get -e` not yet followed by delta
 * or unget), writes one line per edit from its p-file:
 *   SID-gotten SID-of-new-delta login yy/mm/dd hh:mm:ss
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { SccsEnv, sccsOptions } from './sccs/SccsSupport';
import { SccsReport } from './sccs/SccsReport';

export class SactCommand extends Utility {
    readonly utility = 'sact';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const o = sccsOptions(args, '');
        if (o.error) return this.usage(state, o.error);
        if (!o.operands.length) return this.usage(state, 'missing file operand');
        const env = new SccsEnv(context, state);
        const report = new SccsReport(this.utility);
        const files = env.expand(o.operands);
        for (const path of files) {
            const loaded = env.load(path);
            if (!loaded.ok) { report.error(loaded.error); continue; }
            if (files.length > 1) report.out += `\n${path}:\n`;
            for (const p of env.pEntries(path)) report.out += `${p.got} ${p.next} ${p.user} ${p.date} ${p.time}\n`;
        }
        return report.response(state);
    }
}
