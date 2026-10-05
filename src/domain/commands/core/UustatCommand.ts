/**
 * uustat - uucp status inquiry and job control (POSIX uustat, Taylor UUCP).
 *
 *   uustat [-q|-k jobid|-r jobid]
 *   uustat [-a] [-m] [-s system] [-S system] [-u user] [-U user]
 *
 * Lists queued uucp/uux jobs, one per line:
 *   "relayN0001 relay operator 10-05 03:03 Sending /home/operator/f (3 bytes) to ~/f"
 * By default only the invoking user's jobs; -a all jobs; -s/-S and -u/-U
 * select or exclude systems and users. -q summarises the queue per system,
 * -m reports each neighbour's status, -k kills a job and -r rejuvenates it.
 */
import { Utility } from '../shared/Utility';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { getopt } from '../shared/InputFiles';
import { Spool, reply } from '../shared/Spool';
import { UucpSpool, UucpJob } from '../shared/UucpSpool';

const USAGE = 'Usage: uustat [options]\nUse uustat --help for help\n';

export class UustatCommand extends Utility {
    readonly utility = 'uustat';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'aBc:C:eiI:k:KmMNo:pqQr:Rs:S:u:U:Wx:y:');
        if (error) return reply(state, '', `uustat: ${error}\n${USAGE}`, 1);
        if (operands.length) return reply(state, '', USAGE, 1);
        const uucp = new UucpSpool(new Spool(context));
        const spool = uucp.spool;
        const jobs = uucp.jobs();

        for (const opt of ['s', 'S']) {
            const sys = opts.get(opt) as string | undefined;
            if (sys !== undefined && !uucp.known(sys)) return reply(state, '', `uustat: ${sys}: System not found\n`, 1);
        }

        const control = (opt: 'k' | 'r', act: (j: UucpJob) => void): CommandResponse => {
            const id = opts.get(opt) as string;
            const job = jobs.find(j => j.id === id);
            if (!job) return reply(state, '', `uustat: ${id}: Job not found\n`, 1);
            if (!spool.isRoot && job.uid !== context.user.uid) return reply(state, '', `uustat: ${id}: Not submitted by you\n`, 1);
            act(job);
            return reply(state, '', '', 0);
        };
        if (opts.has('k')) return control('k', j => uucp.remove(j));
        if (opts.has('r')) return control('r', j => uucp.touch(j));

        if (opts.has('q')) {
            const out = uucp.systems().map(sys => {
                const mine = jobs.filter(j => j.system === sys);
                if (!mine.length) return '';
                const c = mine.filter(j => j.kind !== 'execute').length;
                const x = mine.length - c;
                const oldest = UucpSpool.describe(mine[0]).split(' ').slice(3, 5).join(' ');
                return `${sys.padEnd(15)} ${c}C ${x}X  ${oldest} Waiting for a conversation\n`;
            }).join('');
            return reply(state, out, '', 0);
        }
        if (opts.has('m')) {
            return reply(state, uucp.systems().map(s => `${s.padEnd(15)} Never contacted (no network connection)\n`).join(''), '', 0);
        }

        const sel = (v: string, inc?: string | true, exc?: string | true) =>
            (typeof inc !== 'string' || inc === v) && (typeof exc !== 'string' || exc !== v);
        const showAll = opts.has('a') || opts.has('s') || opts.has('S') || opts.has('u') || opts.has('U');
        const listed = jobs.filter(j =>
            (showAll || j.user === spool.userName) &&
            sel(j.system, opts.get('s'), opts.get('S')) && sel(j.user, opts.get('u'), opts.get('U')));
        return reply(state, listed.map(j => UucpSpool.describe(j) + '\n').join(''), '', 0);
    }
}
