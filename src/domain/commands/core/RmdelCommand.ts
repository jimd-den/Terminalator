/**
 * rmdel - remove a delta from an SCCS file (POSIX): `rmdel -r SID file...`
 *
 * The delta must be the newest on its branch (no successor), must not be
 * the base of a pending edit, and may be removed only by its creator (or
 * the owner of the s-file, or the superuser). Its lines leave the body and
 * its entry becomes type "R" in the delta table.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { statPath } from '../shared/FileInfo';
import { Sid } from './sccs/Sid';
import { removeDelta } from './sccs/SccsWeave';
import { SccsEnv, sccsOptions, optValue } from './sccs/SccsSupport';
import { SccsReport } from './sccs/SccsReport';

export class RmdelCommand extends Utility {
    readonly utility = 'rmdel';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const o = sccsOptions(args, 'r:');
        if (o.error) return this.usage(state, o.error);
        const rText = optValue(o, 'r');
        if (rText === undefined) return this.usage(state, 'a SID must be specified with -r');
        if (!o.operands.length) return this.usage(state, 'missing file operand');
        const sid = Sid.parse(rText);
        if (!sid || (sid.depth !== 2 && sid.depth !== 4)) return this.usage(state, `invalid SID '${rText}'`);
        const env = new SccsEnv(context, state);
        const report = new SccsReport(this.utility);
        for (const path of env.expand(o.operands)) {
            const loaded = env.load(path);
            if (!loaded.ok) { report.error(loaded.error); continue; }
            const file = loaded.file;
            const delta = file.live.find(d => d.sid.equals(sid));
            if (!delta) { report.error(`${path}: SID ${sid} not found in SCCS file.`); continue; }
            if (file.live.some(d => d.pred === delta.serial)) { report.error(`${path}: SID ${sid} has a successor.`); continue; }
            if (env.pEntries(path).some(p => p.got.equals(sid))) { report.error(`${path}: SID ${sid} is being edited.`); continue; }
            const owner = statPath(context, path)?.inode.uid;
            if (delta.user !== env.user && context.user.uid !== 0 && owner !== context.user.uid) {
                report.error(`${path}: you (${env.user}) did not make delta ${sid}.`);
                continue;
            }
            delta.type = 'R';
            file.body = removeDelta(file.body, delta.serial);
            const err = env.save(path, file);
            if (err) report.error(err);
        }
        return report.response(state);
    }
}
