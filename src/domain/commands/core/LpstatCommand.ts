/**
 * lpstat - print printer and job status information (CUPS lpstat).
 *
 *   lpstat [-dlrRst] [-a [dest...]] [-o [dest...]] [-p [printer...]] [-u [user...]] [-v [printer...]]
 *
 * With no options, lists the invoking user's queued requests. Options that
 * take a list accept it attached or as the next argument (comma or blank
 * separated); without it they apply to all destinations or users.
 */
import { Utility } from '../shared/Utility';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { Spool, asctime, reply } from '../shared/Spool';
import { PrintSpool, PrintJob, Printer } from '../shared/PrintSpool';

type Report = { opt: string; list: string[] | null };

const WITH_LIST = new Set(['a', 'o', 'p', 'u', 'v', 'c']);

export class LpstatCommand extends Utility {
    readonly utility = 'lpstat';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const reports: Report[] = [];
        const operands: string[] = [];
        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            if (!a.startsWith('-') || a === '-') { operands.push(a); continue; }
            for (let j = 1; j < a.length; j++) {
                const c = a[j];
                if (WITH_LIST.has(c)) {
                    let value: string | undefined = a.substring(j + 1) || undefined;
                    if (value === undefined && args[i + 1] !== undefined && !args[i + 1].startsWith('-')) value = args[++i];
                    reports.push({ opt: c, list: value ? value.split(/[,\s]+/).filter(Boolean) : null });
                    break;
                }
                if (!'dlrRstW'.includes(c)) return reply(state, '', `lpstat: Unknown option "${c}".\n`, 1);
                if (c === 'W') { i++; break; }
                reports.push({ opt: c, list: null });
            }
        }
        const spool = new Spool(context);
        const queue = new PrintSpool(spool);
        const printers = queue.printers();
        const jobs = queue.jobs();
        const since = asctime(new Date(spool.mtime('/etc/printcap')));
        const def = queue.defaultDest(context.env);
        if (operands.length) reports.push({ opt: 'o', list: operands });
        if (!reports.length || reports.every(r => 'lW'.includes(r.opt))) reports.push({ opt: 'u', list: [spool.userName] });

        let out = '', err = '';
        const pick = (list: string[] | null): Printer[] | null => {
            if (!list) return printers;
            const bad = list.find(n => !printers.some(p => p.name === n));
            if (bad) { err += `lpstat: Invalid destination name in list "${bad}".\n`; return null; }
            return printers.filter(p => list.includes(p.name));
        };
        const jobLines = (sel: (j: PrintJob) => boolean) => jobs.filter(sel).map(j => PrintSpool.jobLine(j) + '\n').join('');
        const defaultLine = () => def ? `system default destination: ${def}\n` : 'no system default destination\n';
        const devices = (ps: Printer[]) => ps.map(p => `device for ${p.name}: ${p.device}\n`).join('');
        const accepting = (ps: Printer[]) => ps.map(p => `${p.name} accepting requests since ${since}\n`).join('');
        const status = (ps: Printer[]) => ps.map(p => {
            const active = jobs.find(j => j.dest === p.name);
            return active ? `printer ${p.name} now printing ${p.name}-${active.id}.  enabled since ${since}\n`
                : `printer ${p.name} is idle.  enabled since ${since}\n`;
        }).join('');

        for (const r of reports) {
            switch (r.opt) {
                case 'd': out += defaultLine(); break;
                case 'r': out += 'scheduler is running\n'; break;
                case 'v': { const ps = pick(r.list); if (ps) out += devices(ps); break; }
                case 'a': { const ps = pick(r.list); if (ps) out += accepting(ps); break; }
                case 'p': { const ps = pick(r.list); if (ps) out += status(ps); break; }
                case 'c': break; // no printer classes are configured
                case 'o': {
                    const ps = pick(r.list);
                    if (ps) out += jobLines(j => ps.some(p => p.name === j.dest) || (r.list ?? []).includes(`${j.dest}-${j.id}`));
                    break;
                }
                case 'u': out += jobLines(j => !r.list || r.list.includes(j.user)); break;
                case 's': out += defaultLine() + devices(printers); break;
                case 't': out += 'scheduler is running\n' + defaultLine() + devices(printers) + accepting(printers) + status(printers) + jobLines(() => true); break;
            }
        }
        return reply(state, out, err, err ? 1 : 0);
    }
}
