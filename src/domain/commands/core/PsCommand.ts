/**
 * ps - report process status (POSIX): -A -a -d -e -f -l -g -G -n -o -p -t -u -U,
 * plus the BSD forms `ps aux` / `ps ax` / `ps u`.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { ProcessEntry, processTableFor } from '../../entities/ProcessTable';
import { Utility } from '../shared/Utility';
import { UserDatabase } from '../../services/UserDatabase';

const MEM_TOTAL_KB = 4028844;

interface Column { header: string; width: number; left?: boolean; value: (p: ProcessEntry) => string; }

function cputime(ms: number, bsd = false): string {
    const s = Math.floor(ms / 1000);
    if (bsd) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (d ? `${d}-` : '') + [h, m, sec].map(n => String(n).padStart(2, '0')).join(':');
}

function stime(ms: number): string {
    const d = new Date(ms), now = new Date();
    if (d.toDateString() === now.toDateString()) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}${String(d.getDate()).padStart(2, '0')}`;
}

function etime(ms: number): string {
    const s = Math.floor((Date.now() - ms) / 1000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const mmss = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    if (d) return `${d}-${String(h).padStart(2, '0')}:${mmss}`;
    return h ? `${String(h).padStart(2, '0')}:${mmss}` : mmss;
}

export class PsCommand extends Utility {
    readonly utility = 'ps';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const table = context.processes ?? processTableFor(context.fileSystemService.fileSystem);
        const db = new UserDatabase(context.fileSystemService);
        const user = (uid: number) => db.userName(uid);
        const group = (gid: number) => db.groupName(gid);

        const COLS: Record<string, () => Column> = {
            user: () => ({ header: 'USER', width: 8, left: true, value: p => user(p.uid) }),
            ruser: () => ({ header: 'RUSER', width: 8, left: true, value: p => user(p.uid) }),
            uid: () => ({ header: 'UID', width: 5, value: p => String(p.uid) }),
            group: () => ({ header: 'GROUP', width: 8, left: true, value: p => group(p.gid) }),
            rgroup: () => ({ header: 'RGROUP', width: 8, left: true, value: p => group(p.gid) }),
            pid: () => ({ header: 'PID', width: 5, value: p => String(p.pid) }),
            ppid: () => ({ header: 'PPID', width: 5, value: p => String(p.ppid) }),
            pgid: () => ({ header: 'PGID', width: 5, value: p => String(p.pid) }),
            pcpu: () => ({ header: '%CPU', width: 4, value: () => '0.0' }),
            '%cpu': () => ({ header: '%CPU', width: 4, value: () => '0.0' }),
            '%mem': () => ({ header: '%MEM', width: 4, value: p => ((p.rss / MEM_TOTAL_KB) * 100).toFixed(1) }),
            vsz: () => ({ header: 'VSZ', width: 6, value: p => String(p.vsz) }),
            rss: () => ({ header: 'RSS', width: 5, value: p => String(p.rss) }),
            nice: () => ({ header: 'NI', width: 3, value: p => String(p.nice) }),
            ni: () => ({ header: 'NI', width: 3, value: p => String(p.nice) }),
            etime: () => ({ header: 'ELAPSED', width: 11, value: p => etime(p.start) }),
            time: () => ({ header: 'TIME', width: 8, value: p => cputime(p.cpu) }),
            tty: () => ({ header: 'TT', width: 8, left: true, value: p => p.tty ?? '?' }),
            tt: () => ({ header: 'TT', width: 8, left: true, value: p => p.tty ?? '?' }),
            stat: () => ({ header: 'STAT', width: 4, left: true, value: p => p.state + (p.nice < 0 ? '<' : p.nice > 0 ? 'N' : '') }),
            s: () => ({ header: 'S', width: 1, value: p => p.state }),
            stime: () => ({ header: 'STIME', width: 5, left: true, value: p => stime(p.start) }),
            start: () => ({ header: 'START', width: 5, left: true, value: p => stime(p.start) }),
            comm: () => ({ header: 'COMMAND', width: 15, left: true, value: p => p.args.replace(/^-/, '').split(' ')[0].split('/').pop()! }),
            args: () => ({ header: 'COMMAND', width: 27, left: true, value: p => p.args }),
            cmd: () => ({ header: 'CMD', width: 27, left: true, value: p => p.args }),
            command: () => ({ header: 'COMMAND', width: 27, left: true, value: p => p.args }),
        };

        // --- Parse options -------------------------------------------------
        let all = false, withTty = false, notLeaders = false, full = false, long = false, bsdUser = false, bsdAll = false, bsdX = false;
        const pids: number[] = [], users: string[] = [], ttys: string[] = [];
        let custom: { key: string; header?: string }[] | null = null;
        const ops = [...args];
        if (ops[0] && !ops[0].startsWith('-') && /^[auxfwe]+$/.test(ops[0])) {
            const bsd = ops.shift()!;
            bsdUser = bsd.includes('u'); bsdAll = bsd.includes('a'); bsdX = bsd.includes('x');
        }
        for (let i = 0; i < ops.length; i++) {
            const a = ops[i];
            const take = (flagLen: number) => (a.length > flagLen ? a.substring(flagLen) : ops[++i]);
            if (!a.startsWith('-')) return this.usage(state, `unsupported SysV option`, 1);
            const f = a[1];
            if ('oputUgGs'.includes(f)) {
                const val = take(2);
                if (val === undefined) return this.usage(state, `option requires an argument -- '${f}'`);
                const list = val.split(/[ ,]+/).filter(Boolean);
                if (f === 'o') {
                    custom = custom ?? [];
                    for (const item of list) {
                        const [key, header] = item.split('=');
                        if (!COLS[key.toLowerCase()]) return this.usage(state, `error: unknown user-defined format specifier "${key}"`);
                        custom.push({ key: key.toLowerCase(), header });
                    }
                } else if (f === 'p') pids.push(...list.map(Number));
                else if (f === 'u' || f === 'U') users.push(...list);
                else if (f === 't') ttys.push(...list);
                continue;
            }
            for (const c of a.substring(1)) {
                if (c === 'A' || c === 'e') all = true;
                else if (c === 'a') notLeaders = true;
                else if (c === 'd') { all = true; }
                else if (c === 'f') full = true;
                else if (c === 'l') long = true;
                else if (c === 'n' || c === 'w' || c === 'H') continue;
                else return this.usage(state, `error: unsupported option (BSD syntax)\nps: invalid option -- '${c}'`);
            }
        }

        // --- Select ---------------------------------------------------------
        const me = context.user.uid;
        const myTty = 'pts/0';
        const uidOf = (u: string) => (/^[0-9]+$/.test(u) ? Number(u) : db.byName(u)?.uid ?? -1);
        let procs = table.list();
        if (bsdUser || bsdAll || bsdX) {
            procs = procs.filter(p => (bsdAll || p.uid === me) && (bsdX || p.tty !== null));
        } else if (pids.length || users.length || ttys.length) {
            procs = procs.filter(p => pids.includes(p.pid) || users.map(uidOf).includes(p.uid) || ttys.includes(p.tty ?? ''));
        } else if (all) {
            // every process
        } else if (notLeaders) {
            procs = procs.filter(p => p.tty !== null && p.args !== '-sh');
        } else {
            procs = procs.filter(p => p.tty === myTty && p.uid === me);
            void withTty;
        }

        // --- Format ---------------------------------------------------------
        let columns: Column[];
        if (custom) {
            columns = custom.map(c => ({ ...COLS[c.key](), ...(c.header !== undefined ? { header: c.header } : {}) }));
        } else if (bsdUser) {
            columns = ['user', 'pid', '%cpu', '%mem', 'vsz', 'rss', 'tty', 'stat', 'start', 'time', 'command'].map(k => COLS[k]());
            columns[6] = { ...columns[6], header: 'TTY' };
            columns[9] = { header: 'TIME', width: 5, value: p => cputime(p.cpu, true) };
        } else if (long) {
            columns = [
                { header: 'F', width: 1, value: () => '4' }, COLS.s(),
                ...(full ? [COLS.user()] : [COLS.uid()]), COLS.pid(), COLS.ppid(),
                { header: 'C', width: 2, value: () => '0' }, { header: 'PRI', width: 3, value: p => String(80 + p.nice) }, COLS.ni(),
                { header: 'ADDR', width: 4, value: () => '-' }, { header: 'SZ', width: 5, value: p => String(Math.ceil(p.vsz / 4)) },
                { header: 'WCHAN', width: 6, left: true, value: p => (p.state === 'S' ? 'do_wai' : '-') },
                ...(full ? [COLS.stime()] : []), COLS.tty(), COLS.time(), full ? COLS.cmd() : { ...COLS.comm(), header: 'CMD' },
            ];
        } else if (full) {
            columns = [{ ...COLS.user(), header: 'UID' }, COLS.pid(), COLS.ppid(), { header: 'C', width: 2, value: () => '0' }, COLS.stime(), { ...COLS.tty(), header: 'TTY' }, COLS.time(), COLS.cmd()];
        } else {
            columns = [COLS.pid(), { ...COLS.tty(), header: 'TTY' }, COLS.time(), { ...COLS.comm(), header: 'CMD' }];
        }

        const rows = procs.map(p => columns.map(c => c.value(p)));
        const widths = columns.map((c, i) => Math.max(c.left && i === columns.length - 1 ? 0 : c.width, c.header.length, ...rows.map(r => r[i].length)));
        const fmt = (cells: string[]) => cells.map((v, i) => {
            const last = i === cells.length - 1;
            if (columns[i].left) return last ? v : v.padEnd(widths[i]);
            return v.padStart(widths[i]);
        }).join(' ').replace(/\s+$/, '');
        const headerShown = columns.some(c => c.header !== '');
        const lines = [...(headerShown ? [fmt(columns.map(c => c.header))] : []), ...rows.map(fmt)];
        return this.respond(state, lines.join('\n') + '\n', [], procs.length ? 0 : 1);
    }
}
