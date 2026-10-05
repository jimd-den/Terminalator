/**
 * cancel - cancel print requests (POSIX cancel, CUPS behaviour).
 *
 *   cancel [-a] [-u user] [request-ID...] [destination...]
 *
 * A request ID ("lp-1", or a bare number) cancels that request; a
 * destination cancels its current (oldest) request, or all of the user's
 * requests on it with -a; -a alone cancels all of the user's requests and
 * -u all requests of the named user. Only the owner or the superuser may
 * cancel a request.
 */
import { Utility } from '../shared/Utility';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { getopt } from '../shared/InputFiles';
import { Spool, reply } from '../shared/Spool';
import { PrintSpool, PrintJob } from '../shared/PrintSpool';

export class CancelCommand extends Utility {
    readonly utility = 'cancel';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'aEh:U:u:x');
        if (error) return reply(state, '', `cancel: ${error}\n`, 1);
        const spool = new Spool(context);
        const queue = new PrintSpool(spool);
        const jobs = queue.jobs();
        const mayCancel = (j: PrintJob) => spool.isRoot || j.uid === context.user.uid;
        let err = '';
        const cancel = (j: PrintJob) => {
            if (!mayCancel(j)) { err += `cancel: cancel-job failed: Not authorized to cancel job #${j.id}.\n`; return; }
            queue.remove(j);
        };

        const userOpt = opts.get('u') as string | undefined;
        if (userOpt !== undefined && !spool.isRoot && userOpt !== spool.userName) {
            return reply(state, '', 'cancel: cancel-job failed: Forbidden\n', 1);
        }
        if (!operands.length) {
            if (!opts.has('a') && userOpt === undefined) return reply(state, '', 'cancel: No destination or job ID specified.\n', 1);
            const owner = userOpt ?? (opts.has('a') && spool.isRoot ? undefined : spool.userName);
            jobs.filter(j => owner === undefined || j.user === owner).forEach(cancel);
            return reply(state, '', err, err ? 1 : 0);
        }
        for (const op of operands) {
            const printer = queue.printer(op);
            if (printer) {
                const mine = jobs.filter(j => j.dest === op && (userOpt === undefined ? (opts.has('a') ? mayCancel(j) : true) : j.user === userOpt));
                (opts.has('a') || userOpt !== undefined ? mine : mine.slice(0, 1)).forEach(cancel);
                continue;
            }
            const m = /^(?:(.+)-)?(\d+)$/.exec(op);
            if (!m) { err += `cancel: Unknown destination "${op}".\n`; continue; }
            if (m[1] && !queue.printer(m[1])) { err += `cancel: Unknown destination "${m[1]}".\n`; continue; }
            const job = jobs.find(j => j.id === parseInt(m[2], 10));
            if (!job) { err += `cancel: cancel-job failed: Job #${m[2]} does not exist.\n`; continue; }
            cancel(job);
        }
        return reply(state, '', err, err ? 1 : 0);
    }
}
