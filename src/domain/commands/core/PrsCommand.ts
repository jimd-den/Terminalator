/**
 * prs - print an SCCS file (POSIX):
 *   prs [-a] [-d dataspec] [-r[SID]] [-e | -l] [-c cutoff] file...
 *
 * Without -d every delta is shown in the default format, after a
 * "file:" header (no header when -r selects a delta):
 *   :Dt:\t:DL:\nMRs:\n:MR:COMMENTS:\n:C:
 * -d prints the dataspec once for the selected delta (default: newest);
 * -e adds every earlier delta, -l every later one; -a includes removed
 * deltas. Data keywords are written :X:; "\t" and "\n" are escapes.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { SFile, Delta } from './sccs/SFile';
import { Sid } from './sccs/Sid';
import { extract } from './sccs/SccsWeave';
import { expandAll, keywordValue, KeywordContext } from './sccs/SccsKeywords';
import { selectDelta } from './sccs/SccsVersions';
import { SccsEnv, SccsOptions, sccsOptions, optValue, stamp, stampKey, cutoffKey } from './sccs/SccsSupport';
import { SccsReport } from './sccs/SccsReport';

const DEFAULT_SPEC = ':Dt:\t:DL:\nMRs:\n:MR:COMMENTS:\n:C:';

const FLAG_NAMES: Record<string, string> = {
    b: 'branch', c: 'ceiling', d: 'default SID', e: 'encoded', f: 'floor', i: 'id keywd err/warn',
    j: 'joint edit', l: 'locked releases', m: 'module', n: 'null delta', q: 'csect name', t: 'type', v: 'validate MRs',
};

export class PrsCommand extends Utility {
    readonly utility = 'prs';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const o = sccsOptions(args, 'd:r::elac:');
        if (o.error) return this.usage(state, o.error);
        if (!o.operands.length) return this.usage(state, 'missing file operand');
        if (o.opts.has('e') && o.opts.has('l')) return this.usage(state, '-e and -l are mutually exclusive');
        const env = new SccsEnv(context, state);
        const report = new SccsReport(this.utility);
        for (const path of env.expand(o.operands)) this.prsOne(path, o, env, report);
        return report.response(state);
    }

    private prsOne(path: string, o: SccsOptions, env: SccsEnv, report: SccsReport): void {
        const loaded = env.load(path);
        if (!loaded.ok) return report.error(loaded.error);
        const file = loaded.file;
        const spec = optValue(o, 'd');
        const rText = optValue(o, 'r');
        const cText = optValue(o, 'c');
        const all = o.opts.has('a');
        const candidates = file.deltas.filter(d => all || d.type === 'D');

        let chosen: Delta[];
        if (spec === undefined && !rText && !o.opts.has('e') && !o.opts.has('l') && cText === undefined) {
            chosen = candidates;
            report.out += `${path}:\n\n`;
        } else {
            let anchor: Delta | undefined;
            if (cText !== undefined) {
                const key = cutoffKey(cText);
                if (!key) return report.error(`${path}: invalid cutoff '${cText}'`);
                anchor = candidates.filter(d => stampKey(d.date, d.time) <= key)[0];
                if (!anchor) return;
            } else if (rText) {
                const sid = Sid.parse(rText);
                if (!sid) return report.error(`${path}: invalid SID '${rText}'`);
                anchor = sid.depth === 2 || sid.depth === 4 ? candidates.find(d => d.sid.equals(sid)) : undefined;
                if (!anchor) {
                    const sel = selectDelta(file, sid);
                    if (!sel.ok) return report.error(`${path}: ${sel.error}`);
                    anchor = sel.delta;
                }
            } else anchor = candidates[0];
            if (!anchor) return;
            const at = candidates.indexOf(anchor);
            chosen = o.opts.has('e') ? candidates.slice(at) : o.opts.has('l') ? candidates.slice(0, at + 1) : [anchor];
        }

        const format = spec === undefined ? DEFAULT_SPEC : spec.replace(/\\(.)/g, (_, c: string) => (c === 't' ? '\t' : c === 'n' ? '\n' : c));
        for (const d of chosen) report.out += this.render(format, file, d, path, env) + '\n';
    }

    private render(format: string, file: SFile, d: Delta, path: string, env: SccsEnv): string {
        const gname = SccsEnv.gName(path);
        const kc: KeywordContext = { file, delta: d, gname, sname: path, spath: env.abs(path), now: stamp() };
        return format.replace(/:([A-Za-z]{1,2}):/g, (all, key: string) => this.value(key, file, d, kc) ?? all);
    }

    private value(key: string, file: SFile, d: Delta, kc: KeywordContext): string | undefined {
        const pad = (n: number) => String(n).padStart(5, '0');
        const sids = (serials: number[]) => serials.map(s => file.bySerial(s)?.sid.toString() ?? String(s)).join(' ');
        const lines = (ls: string[]) => ls.map(l => l + '\n').join('');
        const flag = (k: string) => file.flags.get(k);
        const yesNo = (k: string) => (file.flags.has(k) ? 'yes' : 'no');
        const [yy, mm, dd] = d.date.split('/');
        const [th, tm, ts] = d.time.split(':');
        switch (key) {
            case 'Dt': return `${d.type} ${d.sid} ${d.date} ${d.time} ${d.user} ${d.serial} ${d.pred}`;
            case 'DL': return `${pad(d.inserted)}/${pad(d.deleted)}/${pad(d.unchanged)}`;
            case 'Li': return pad(d.inserted);
            case 'Ld': return pad(d.deleted);
            case 'Lu': return pad(d.unchanged);
            case 'DT': return d.type;
            case 'I': return d.sid.toString();
            case 'R': return String(d.sid.rel);
            case 'L': return String(d.sid.lev);
            case 'B': return d.sid.br ? String(d.sid.br) : '';
            case 'S': return d.sid.seq ? String(d.sid.seq) : '';
            case 'D': return d.date;
            case 'Dy': return yy;
            case 'Dm': return mm;
            case 'Dd': return dd;
            case 'T': return d.time;
            case 'Th': return th;
            case 'Tm': return tm;
            case 'Ts': return ts;
            case 'P': return d.user;
            case 'DS': return String(d.serial);
            case 'DP': return String(d.pred);
            case 'DI': return [d.included, d.excluded, d.ignored].filter(l => l.length).map(sids).join('/');
            case 'Dn': return sids(d.included);
            case 'Dx': return sids(d.excluded);
            case 'Dg': return sids(d.ignored);
            case 'MR': return lines(d.mrs);
            case 'C': return lines(d.comments);
            case 'UN': return file.users.length ? lines(file.users) : 'none\n';
            case 'FL': return [...file.flags.keys()].sort().map(k => `${FLAG_NAMES[k] ?? k}${flag(k) ? '\t' + flag(k) : ''}\n`).join('');
            case 'Y': return flag('t') ?? 'none';
            case 'MF': return yesNo('v');
            case 'MP': return flag('v') || 'none';
            case 'KF': return yesNo('i');
            case 'KV': return flag('i') || 'none';
            case 'BF': return yesNo('b');
            case 'J': return yesNo('j');
            case 'LK': return flag('l') ?? 'none';
            case 'Q': return flag('q') ?? '';
            case 'M': return file.moduleName(kc.gname);
            case 'FB': return flag('f') ?? 'none';
            case 'CB': return flag('c') ?? 'none';
            case 'Ds': return flag('d') ?? 'none';
            case 'ND': return yesNo('n');
            case 'FD': return file.description.length ? lines(file.description) : 'none\n';
            case 'BD': return lines(file.body);
            case 'GB': return lines(expandAll(extract(file.body, file.appliedSet(d)).lines, kc).lines);
            case 'W': return keywordValue('W', 0, kc);
            case 'A': return `@(#)${flag('t') ?? 'none'} ${kc.file.moduleName(kc.gname)} ${d.sid}@(#)`;
            case 'Z': return '@(#)';
            case 'F': return kc.sname.slice(kc.sname.lastIndexOf('/') + 1);
            case 'PN': return kc.spath;
            default: return undefined;
        }
    }
}
