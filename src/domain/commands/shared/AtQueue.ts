import { Spool, asctime, shellQuote } from './Spool';

/**
 * AtQueue - the atd spool (/var/spool/cron/atjobs), laid out as by the
 * Linux at/atd package: one executable script per job named
 * <queue><jobno:5 hex><minutes since the epoch:8 hex>, owned by the job's
 * submitter, and a .SEQ file holding the last job number (hex).
 */
export interface AtJob {
    id: number;
    queue: string;
    time: Date;
    uid: number;
    owner: string;
    file: string;
}

export const AT_SPOOL = '/var/spool/cron/atjobs';
const SEQ = `${AT_SPOOL}/.SEQ`;
const DAEMON_GID = 1;
/** Variables at(1) does not carry into the job environment. */
const NO_EXPORT = new Set(['TERM', 'DISPLAY', '_', 'SHELLOPTS', 'BASH_VERSINFO', 'EUID', 'GROUPS', 'PPID', 'UID', 'PS1', 'PS2', 'PS4', 'OPTIND', 'IFS']);

export class AtQueue {
    constructor(private spool: Spool) { }

    private ensure(): void {
        this.spool.ensureDir('/var/spool/cron', 0o755);
        this.spool.ensureDir(AT_SPOOL, 0o1770, 1, DAEMON_GID);
    }

    /** All jobs, ordered by job number. */
    jobs(): AtJob[] {
        const out: AtJob[] = [];
        for (const name of this.spool.list(AT_SPOOL)) {
            const m = /^([a-zA-Z=])([0-9a-f]{5})([0-9a-f]{8})$/.exec(name);
            if (!m) continue;
            const file = `${AT_SPOOL}/${name}`;
            const node = this.spool.fs.resolve(file, '/');
            const uid = node ? this.spool.fs.getInode(node.inodeId)?.uid ?? 0 : 0;
            out.push({
                id: parseInt(m[2], 16), queue: m[1], time: new Date(parseInt(m[3], 16) * 60000),
                uid, owner: this.spool.users.byUid(uid)?.username ?? String(uid), file,
            });
        }
        return out.sort((a, b) => a.id - b.id);
    }

    find(id: number): AtJob | undefined {
        return this.jobs().find(j => j.id === id);
    }

    /** Spools a job and returns its number. */
    submit(queue: string, time: Date, commands: string, mailAlways: boolean, env: Record<string, string>, cwd: string, umask: number): number {
        this.ensure();
        const id = this.spool.nextSequence(SEQ, 16);
        const minutes = Math.floor(time.getTime() / 60000);
        const name = `${queue}${id.toString(16).padStart(5, '0')}${minutes.toString(16).padStart(8, '0')}`;
        const { uid, gid } = this.spool.context.user;
        const user = this.spool.userName;
        const exports = Object.keys(env).filter(k => /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) && !NO_EXPORT.has(k)).sort()
            .map(k => `${k}=${shellQuote(env[k])}; export ${k}\n`).join('');
        const delimiter = `marcinDELIMITER${(0x5f3a1c00 + id * 2654435761 >>> 0).toString(16).padStart(8, '0')}`;
        const body = commands.endsWith('\n') || commands === '' ? commands : commands + '\n';
        const script =
            '#!/bin/sh\n' +
            `# atrun uid=${uid} gid=${gid}\n` +
            `# mail ${user} ${mailAlways ? 1 : 0}\n` +
            `umask ${umask.toString(8)}\n` +
            exports +
            `cd ${shellQuote(cwd)} || {\n\t echo 'Execution directory inaccessible' >&2\n\t exit 1\n}\n` +
            `\${SHELL:-/bin/sh} << '${delimiter}'\n\n${body}${delimiter}\n`;
        this.spool.write(`${AT_SPOOL}/${name}`, script, 0o700, uid, gid);
        return id;
    }

    remove(job: AtJob): void {
        this.spool.remove(job.file);
    }

    /** The atq(1) line for a job: "1\tSun Oct  4 19:30:00 2026 a operator". */
    static format(job: AtJob): string {
        return `${job.id}\t${asctime(job.time)} ${job.queue} ${job.owner}`;
    }
}
