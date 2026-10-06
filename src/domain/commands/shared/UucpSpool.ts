import { Spool } from './Spool';
import { LocalMailer } from './Mailbox';
import { asctime, rfc5322Date } from './Spool';

/**
 * UucpSpool - the UUCP work queue, laid out as by Taylor UUCP:
 * /var/spool/uucp/<system>/C./<jobid> command files (plus D. data files),
 * where a job ID is <system><grade><sequence>, e.g. "relayN0001". Known
 * neighbours come from /etc/uucp/sys ("system <name>" entries); the local
 * system is the host name. There is no network, so jobs for remote systems
 * stay queued until killed; local work is carried out at once.
 */
export const UUCP_SPOOL = '/var/spool/uucp';
export const UUCP_PUBLIC = '/var/spool/uucppublic';

export type UucpKind = 'send' | 'receive' | 'execute';

export interface UucpJob {
    id: string;
    system: string;
    user: string;
    uid: number;
    time: Date;
    kind: UucpKind;
    /** send/receive: source and destination; execute: the command. */
    source: string;
    dest: string;
    bytes: number;
    file: string;
}

export class UucpSpool {
    constructor(readonly spool: Spool) { }

    get localSystem(): string {
        return this.spool.hostname();
    }

    /** Neighbours listed in /etc/uucp/sys. */
    systems(): string[] {
        const text = this.spool.read('/etc/uucp/sys') ?? '';
        return text.split('\n').map(l => /^\s*system\s+(\S+)/.exec(l.replace(/#.*/, ''))?.[1]).filter((s): s is string => !!s);
    }

    known(system: string): boolean {
        return system === this.localSystem || this.systems().includes(system);
    }

    /** Allocates a job ID for `system` at `grade`. */
    newJobId(system: string, grade: string): string {
        this.spool.ensureDir(UUCP_SPOOL, 0o755);
        const seq = this.spool.nextSequence(`${UUCP_SPOOL}/.SEQF`);
        return `${system}${grade}${seq.toString(36).padStart(4, '0')}`;
    }

    /** Writes a command file for a queued remote job. */
    queue(job: Omit<UucpJob, 'user' | 'uid' | 'time' | 'file'>, data?: string): void {
        const dir = `${UUCP_SPOOL}/${job.system}/C.`;
        this.spool.ensureDir(`${UUCP_SPOOL}/${job.system}`, 0o755);
        this.spool.ensureDir(dir, 0o755);
        const { uid, gid } = this.spool.context.user;
        const user = this.spool.userName;
        if (data !== undefined) {
            this.spool.ensureDir(`${UUCP_SPOOL}/${job.system}/D.`, 0o755);
            this.spool.write(`${UUCP_SPOOL}/${job.system}/D./D.${job.id}`, data, 0o600, uid, gid);
        }
        const line = job.kind === 'send' ? `S ${job.source} ${job.dest} ${user} -C D.${job.id} 0644`
            : job.kind === 'receive' ? `R ${job.source} ${job.dest} ${user} -d`
                : `E ${job.source} ${user}`;
        const text = `# user ${user}\n# time ${Math.floor(Date.now() / 1000)}\n# kind ${job.kind}\n# bytes ${job.bytes}\n` +
            `# source ${job.source}\n# dest ${job.dest}\n${line}\n`;
        this.spool.write(`${dir}/${job.id}`, text, 0o600, uid, gid);
    }

    jobs(): UucpJob[] {
        const out: UucpJob[] = [];
        for (const system of this.spool.list(UUCP_SPOOL)) {
            const dir = `${UUCP_SPOOL}/${system}/C.`;
            for (const id of this.spool.list(dir)) {
                const file = `${dir}/${id}`;
                const meta = new Map<string, string>();
                for (const l of (this.spool.read(file) ?? '').split('\n')) {
                    const m = /^# (\w+) (.*)$/.exec(l);
                    if (m) meta.set(m[1], m[2]);
                }
                const user = meta.get('user') ?? '';
                out.push({
                    id, system, user, uid: this.spool.users.byName(user)?.uid ?? -1,
                    time: new Date(parseInt(meta.get('time') ?? '0', 10) * 1000),
                    kind: (meta.get('kind') as UucpKind) ?? 'send', source: meta.get('source') ?? '', dest: meta.get('dest') ?? '',
                    bytes: parseInt(meta.get('bytes') ?? '0', 10), file,
                });
            }
        }
        return out.sort((a, b) => a.time.getTime() - b.time.getTime() || a.id.localeCompare(b.id));
    }

    remove(job: UucpJob): void {
        this.spool.remove(job.file);
        const data = `${UUCP_SPOOL}/${job.system}/D./D.${job.id}`;
        if (this.spool.exists(data)) this.spool.remove(data);
    }

    touch(job: UucpJob): void {
        const text = (this.spool.read(job.file) ?? '').replace(/^# time \d+$/m, `# time ${Math.floor(Date.now() / 1000)}`);
        this.spool.write(job.file, text, 0o600, job.uid < 0 ? 0 : job.uid, this.spool.context.user.gid);
    }

    /** uustat's line: "relayN0001 relay operator 10-05 03:03 Sending /home/operator/f (3 bytes) to ~/f". */
    static describe(job: UucpJob): string {
        const t = job.time;
        const stamp = `${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ` +
            `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
        const what = job.kind === 'send' ? `Sending ${job.source} (${job.bytes} bytes) to ${job.dest}`
            : job.kind === 'receive' ? `Requesting ${job.source} to ${job.dest}`
                : `Executing ${job.source} (sending ${job.bytes} bytes)`;
        return `${job.id} ${job.system} ${job.user} ${stamp} ${what}`;
    }

    /** Mails the requester the outcome of a job (uucp -m, uux notification). */
    notify(subject: string, body: string): void {
        const now = new Date();
        const host = this.localSystem;
        new LocalMailer(this.spool).deliverLocal(this.spool.userName, {
            envelope: `uucp@${host}`,
            date: asctime(now),
            headers: [['Date', rfc5322Date(now)], ['From', `uucp@${host}`], ['To', this.spool.userName], ['Subject', subject]],
            body,
        });
    }
}
