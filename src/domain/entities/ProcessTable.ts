/**
 * ProcessTable - Domain Entity
 *
 * The kernel's process list for one host: init, kernel threads, system
 * daemons, login shells and the commands currently running. Utilities
 * such as ps, kill, nice and renice operate on it (and /proc reflects it).
 */

export type ProcessState = 'R' | 'S' | 'T' | 'Z' | 'I';

export interface ProcessEntry {
    pid: number;
    ppid: number;
    uid: number;
    gid: number;
    /** Controlling terminal ("pts/0") or null for daemons. */
    tty: string | null;
    nice: number;
    state: ProcessState;
    /** Start time (ms since epoch). */
    start: number;
    /** Accumulated CPU time (ms). */
    cpu: number;
    /** Full command line. */
    args: string;
    /** Resident / virtual size in KiB. */
    rss: number;
    vsz: number;
}

export type Credentials = { uid: number; gid: number; groups: number[] };

export type SignalResult = 'ok' | 'ESRCH' | 'EPERM';

const SYSTEM_PROCESSES: [number, string, number, number][] = [
    // [pid, args, uid, rss]
    [1, '/sbin/init', 0, 11204],
    [2, '[kthreadd]', 0, 0],
    [3, '[rcu_gp]', 0, 0],
    [12, '[ksoftirqd/0]', 0, 0],
    [85, '/lib/systemd/systemd-journald', 0, 15880],
    [212, '/usr/sbin/cron -f', 0, 2648],
    [215, '/usr/sbin/rsyslogd -n', 0, 4420],
    [402, 'sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups', 0, 7360],
    [433, '/sbin/agetty -o -p -- \\u --noclear --keep-baud console 115200,38400,9600 vt220', 0, 1868],
    [981, '/lib/systemd/systemd --user', 1000, 9612],
    [982, '(sd-pam)', 1000, 3412],
];

export class ProcessTable {
    private procs = new Map<number, ProcessEntry>();
    private nextPid = 5000;

    constructor(private bootTime: number = Date.now() - 3 * 24 * 3600 * 1000) {
        for (const [pid, args, uid, rss] of SYSTEM_PROCESSES) {
            this.procs.set(pid, {
                pid, ppid: pid <= 2 ? 0 : pid <= 12 ? 2 : pid === 982 ? 981 : 1, uid, gid: uid, tty: pid === 433 ? 'console' : null,
                nice: pid === 3 ? -20 : 0, state: args.startsWith('[') ? 'I' : 'S', start: bootTime + pid * 37, cpu: rss / 4,
                args, rss, vsz: rss ? rss * 3 : 0,
            });
        }
    }

    /** Ensures the login shell for a session exists (its pid is the shell's $$). */
    ensureShell(pid: number, user: Credentials, tty = 'pts/0'): ProcessEntry {
        let shell = this.procs.get(pid);
        if (!shell) {
            shell = {
                pid, ppid: 402, uid: user.uid, gid: user.gid, tty, nice: 0, state: 'S',
                start: Date.now(), cpu: 30, args: '-sh', rss: 3940, vsz: 8240,
            };
            this.procs.set(pid, shell);
        }
        return shell;
    }

    spawn(ppid: number, user: Credentials, args: string, tty: string | null, nice = 0): ProcessEntry {
        while (this.procs.has(this.nextPid)) this.nextPid++;
        const parent = this.procs.get(ppid);
        const entry: ProcessEntry = {
            pid: this.nextPid++, ppid, uid: user.uid, gid: user.gid, tty, nice: parent ? Math.max(parent.nice, nice) : nice,
            state: 'R', start: Date.now(), cpu: 0, args, rss: 2048 + (args.length * 31) % 4096, vsz: 9000,
        };
        this.procs.set(entry.pid, entry);
        return entry;
    }

    exit(pid: number): void {
        this.procs.delete(pid);
    }

    get(pid: number): ProcessEntry | undefined {
        return this.procs.get(pid);
    }

    list(): ProcessEntry[] {
        return Array.from(this.procs.values()).sort((a, b) => a.pid - b.pid);
    }

    /** kill(2): permission checks and default signal actions. */
    signal(pid: number, sig: number, sender: Credentials): SignalResult {
        const p = this.procs.get(pid);
        if (!p) return 'ESRCH';
        if (sender.uid !== 0 && sender.uid !== p.uid) return 'EPERM';
        if (sig === 0) return 'ok';
        if (pid === 1) return 'ok'; // init ignores signals it has no handler for
        if (sig === 19 || sig === 20 || sig === 21 || sig === 22) p.state = 'T';      // STOP, TSTP, TTIN, TTOU
        else if (sig === 18) p.state = p.state === 'T' ? 'S' : p.state;            // CONT
        else if (sig === 17 || sig === 23 || sig === 28) { /* CHLD, URG, WINCH: ignored */ }
        else if (p.args === '-sh' && (sig === 15 || sig === 2 || sig === 3)) { /* interactive shells ignore TERM/INT/QUIT */ }
        else this.procs.delete(pid);
        return 'ok';
    }

    /** setpriority(2): raising priority (lowering nice) needs root. */
    renice(pid: number, nice: number, sender: Credentials): SignalResult {
        const p = this.procs.get(pid);
        if (!p) return 'ESRCH';
        if (sender.uid !== 0 && (sender.uid !== p.uid || nice < p.nice)) return 'EPERM';
        p.nice = Math.max(-20, Math.min(19, nice));
        return 'ok';
    }

    uptimeSeconds(): number {
        return (Date.now() - this.bootTime) / 1000;
    }

    get boot(): number {
        return this.bootTime;
    }
}

/** One process table per host (keyed by the host's file system object). */
const tables = new WeakMap<object, ProcessTable>();

export function processTableFor(host: object): ProcessTable {
    let t = tables.get(host);
    if (!t) {
        t = new ProcessTable();
        tables.set(host, t);
    }
    return t;
}
