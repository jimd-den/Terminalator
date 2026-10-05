/**
 * at, batch, atq, atrm - execute commands at a later time (POSIX at/batch).
 *
 *   at [-m] [-f file] [-q queuename] -t time_arg
 *   at [-m] [-f file] [-q queuename] timespec...
 *   at -r at_job_id...          (also: atrm at_job_id...)
 *   at -l [-q queuename]        (also: atq [-q queuename])
 *   at -l at_job_id...
 *   at -c at_job_id...          (print the job script; Linux extension)
 *   batch [-m] [-f file] [-q queuename]
 *
 * Jobs are spooled in /var/spool/cron/atjobs (see AtQueue). Diagnostics and
 * the "job N at <date>" acknowledgement go to standard error, worded as the
 * Linux at package prints them.
 */
import { Utility } from '../shared/Utility';
import { ProcessContext, getStdinAsString } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { getopt, readInput } from '../shared/InputFiles';
import { Spool, asctime, reply } from '../shared/Spool';
import { AtQueue, AtJob } from '../shared/AtQueue';
import { parseAtTime, parsePosixTime } from '../shared/AtTimeSpec';

export type AtMode = 'at' | 'batch' | 'atq' | 'atrm';

const USAGE = 'Usage: at [-V] [-q x] [-f file] [-u username] [-mMlbv] timespec ...\n' +
    '       at [-V] [-q x] [-f file] [-u username] [-mMlbv] -t time\n' +
    '       at -c job ...\n' +
    '       atq [-V] [-q x]\n' +
    '       at [ -rd ] job ...\n' +
    '       atrm [-V] job ...\n' +
    '       batch\n';

export class AtCommand extends Utility {
    readonly utility: string;

    constructor(private mode: AtMode = 'at') {
        super();
        this.utility = mode;
    }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const spec = this.mode === 'atq' ? 'Vq:' : this.mode === 'atrm' ? 'V' : 'Vq:f:u:mMkvlbdrct:';
        const { opts, operands, error } = getopt(args, spec);
        if (error) return reply(state, '', `${this.utility}: ${error}\n${USAGE}`, 1);
        const queueOpt = opts.get('q') as string | undefined;
        if (queueOpt !== undefined && !/^[a-zA-Z]$/.test(queueOpt)) return reply(state, '', USAGE, 1);

        const queue = new AtQueue(new Spool(context));
        let action: 'submit' | 'list' | 'remove' | 'cat' = 'submit';
        if (this.mode === 'atq' || opts.has('l')) action = 'list';
        else if (this.mode === 'atrm' || opts.has('r') || opts.has('d')) action = 'remove';
        else if (opts.has('c')) action = 'cat';

        switch (action) {
            case 'list': return this.list(queue, context, state, queueOpt, operands);
            case 'remove': return this.remove(queue, context, state, operands);
            case 'cat': return this.cat(queue, context, state, operands);
            default: return this.submit(queue, context, state, opts, operands, queueOpt);
        }
    }

    private visible(job: AtJob, context: ProcessContext): boolean {
        return context.user.uid === 0 || job.uid === context.user.uid;
    }

    private list(queue: AtQueue, context: ProcessContext, state: TerminalState, q: string | undefined, ids: string[]): CommandResponse {
        const jobs = queue.jobs().filter(j => this.visible(j, context) && (!q || j.queue === q) && (ids.length === 0 || ids.includes(String(j.id))));
        return reply(state, jobs.map(j => AtQueue.format(j) + '\n').join(''), '', 0);
    }

    private remove(queue: AtQueue, context: ProcessContext, state: TerminalState, ids: string[]): CommandResponse {
        if (ids.length === 0) return reply(state, '', USAGE, 1);
        let err = '';
        for (const id of ids) {
            const job = /^\d+$/.test(id) ? queue.find(parseInt(id, 10)) : undefined;
            if (!job) { err += `Cannot find jobid ${id}\n`; continue; }
            if (!this.visible(job, context)) { err += `${id}: Not owner\n`; continue; }
            queue.remove(job);
        }
        return reply(state, '', err, err ? 1 : 0);
    }

    private cat(queue: AtQueue, context: ProcessContext, state: TerminalState, ids: string[]): CommandResponse {
        if (ids.length === 0) return reply(state, '', USAGE, 1);
        let out = '', err = '';
        const spool = new Spool(context);
        for (const id of ids) {
            const job = /^\d+$/.test(id) ? queue.find(parseInt(id, 10)) : undefined;
            if (!job) { err += `Cannot find jobid ${id}\n`; continue; }
            if (!this.visible(job, context)) { err += `${id}: Not owner\n`; continue; }
            out += spool.read(job.file) ?? '';
        }
        return reply(state, out, err, err ? 1 : 0);
    }

    private submit(queue: AtQueue, context: ProcessContext, state: TerminalState, opts: Map<string, string | true>, operands: string[], q: string | undefined): CommandResponse {
        const now = new Date();
        let when: Date;
        const batch = this.mode === 'batch' || opts.has('b');
        if (opts.has('t')) {
            if (operands.length) return reply(state, '', USAGE, 1);
            const t = parsePosixTime(opts.get('t') as string, now);
            if (!t) return reply(state, '', `invalid date format: ${opts.get('t')}\n`, 1);
            when = t;
        } else if (operands.length) {
            const parsed = parseAtTime(operands, now);
            if (!parsed.ok) return reply(state, '', `syntax error. Last token seen: ${parsed.token}\nGarbled time\n`, 1);
            when = parsed.time;
        } else if (batch) {
            when = new Date(now.getTime());
            when.setSeconds(0, 0);
        } else {
            return reply(state, '', 'Garbled time\n', 1);
        }
        const floor = new Date(now.getTime());
        floor.setSeconds(0, 0);
        if (when.getTime() < floor.getTime()) {
            return reply(state, '', 'at: refusing to create job destined in the past\n', 1);
        }

        let commands: string;
        const file = opts.get('f') as string | undefined;
        if (file !== undefined) {
            const input = readInput(context, file);
            if (!input.ok) return reply(state, '', `Cannot open input file ${input.error}\n`, 1);
            commands = input.data;
        } else {
            commands = getStdinAsString(context) ?? '';
        }

        let err = opts.has('v') ? `${asctime(when)}\n\n` : '';
        const id = queue.submit(q ?? (batch ? 'b' : 'a'), when, commands, opts.has('m'), context.env, context.cwd, state.umask ?? 0o022);
        err += `warning: commands will be executed using /bin/sh\njob ${id} at ${asctime(when)}\n`;
        return reply(state, '', err, 0);
    }
}
