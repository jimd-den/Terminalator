/**
 * get - get a version of an SCCS file (POSIX):
 *   get [-begkmnlLpst] [-c cutoff] [-i list] [-r SID] [-x list] file...
 *
 * Writes the requested version to the g-file (the s-file name without its
 * "s." prefix, in the current directory; read-only unless -e or -k), or
 * to standard output with -p. -e records the edit in the p-file and
 * leaves keywords unexpanded; otherwise identification keywords (%I%,
 * %M%, ...) are expanded. The SID and line count go to standard output
 * (standard error with -p) unless -s. A directory operand means every
 * s-file in it; "-" reads file names from standard input.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { SFile, Delta } from './sccs/SFile';
import { Sid } from './sccs/Sid';
import { extract } from './sccs/SccsWeave';
import { expandAll } from './sccs/SccsKeywords';
import { selectDelta, nextSid } from './sccs/SccsVersions';
import { SccsEnv, SccsOptions, sccsOptions, optValue, stamp, stampKey, cutoffKey, serialList } from './sccs/SccsSupport';
import { SccsReport } from './sccs/SccsReport';

export class GetCommand extends Utility {
    readonly utility = 'get';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const o = sccsOptions(args, 'r:c:i:x:ebkl::Lpsmngt');
        if (o.error) return this.usage(state, o.error);
        if (!o.operands.length) return this.usage(state, 'missing file operand');
        const env = new SccsEnv(context, state);
        const report = new SccsReport(this.utility);
        const files = env.expand(o.operands);
        for (const path of files) {
            if (files.length > 1 && !o.opts.has('s')) {
                if (o.opts.has('p')) report.err += `\n${path}:\n`; else report.out += `\n${path}:\n`;
            }
            this.getOne(path, o, env, report);
        }
        return report.response(state);
    }

    private getOne(path: string, o: SccsOptions, env: SccsEnv, report: SccsReport): void {
        const has = (c: string) => o.opts.has(c);
        const loaded = env.load(path);
        if (!loaded.ok) return report.error(loaded.error);
        const file = loaded.file;
        const gname = SccsEnv.gName(path);

        const rText = optValue(o, 'r');
        const request = rText !== undefined ? Sid.parse(rText) : null;
        if (rText !== undefined && !request) return report.error(`${path}: invalid SID '${rText}'`);
        const cText = optValue(o, 'c');
        const cutoff = cText !== undefined ? cutoffKey(cText) : undefined;
        if (cutoff === null) return report.error(`${path}: invalid cutoff date '${cText}'`);
        const include = serialList(file, optValue(o, 'i') ?? '');
        const exclude = serialList(file, optValue(o, 'x') ?? '');
        if (!include || !exclude) return report.error(`${path}: invalid delta list`);

        const sel = selectDelta(file, request, cutoff, d => stampKey(d.date, d.time));
        if (!sel.ok) return report.error(`${path}: ${sel.error}`);
        const got = sel.delta;

        const edit = has('e');
        const toStdout = has('p');
        const suppress = has('g');
        let next: Sid | null = null;
        if (edit) {
            const why = this.editRefusal(file, got, env, path);
            if (why) return report.error(why);
            const pending = env.pEntries(path);
            next = nextSid(file, got, request, has('b') && file.flags.has('b'), pending.map(p => p.next));
            const why2 = this.releaseRefusal(file, next.rel, path);
            if (why2) return report.error(why2);
        }
        if (!toStdout && !suppress && env.writable(gname)) return report.error(`${gname}: File exists and is writable.`);

        const applied = file.appliedSet(got, include, exclude);
        const version = extract(file.body, applied);
        let lines = version.lines;
        if (!suppress) {
            if (!edit && !has('k')) {
                const now = stamp();
                const expanded = expandAll(lines, { file, delta: got, gname, sname: path, spath: env.abs(path), now });
                if (!expanded.found) {
                    if (file.flags.has('i')) return report.error(`${path}: No id keywords.`);
                    report.warn(`${path}: No id keywords.`);
                }
                lines = expanded.lines;
            }
            const sidOf = (serial: number) => file.bySerial(serial)?.sid.toString() ?? '';
            const module = file.moduleName(gname);
            lines = lines.map((l, i) => (has('n') ? module + '\t' : '') + (has('m') ? sidOf(version.serials[i]) + '\t' : '') + l);
            const text = lines.map(l => l + '\n').join('');
            if (toStdout) report.out += text;
            else {
                const err = env.writePlain(gname, text, edit || has('k') ? 0o644 : 0o444);
                if (err) return report.error(err);
            }
        }

        if (edit && next) {
            const now = stamp();
            const entries = env.pEntries(path);
            entries.push({ got: got.sid, next, user: env.user, ...now, include: optValue(o, 'i') ?? '', exclude: optValue(o, 'x') ?? '' });
            const err = env.savePEntries(path, entries);
            if (err) return report.error(err);
        }

        const lValue = optValue(o, 'l');
        if (lValue !== undefined || has('L')) {
            const summary = this.summary(file, applied);
            if (lValue === 'p' || has('L')) report.out += summary;
            else {
                const err = env.writePlain('l.' + gname, summary, 0o444);
                if (err) return report.error(err);
            }
        }

        if (!has('s')) {
            let info = `${got.sid}\n`;
            if (next) info += `new delta ${next}\n`;
            if (!suppress) info += `${lines.length} lines\n`;
            if (toStdout) report.err += info; else report.out += info;
        }
    }

    /** Why the user may not edit this delta, or null. */
    private editRefusal(file: SFile, got: Delta, env: SccsEnv, path: string): string | null {
        if (!env.authorized(file)) return `${path}: You (${env.user}) are not authorised to make deltas.`;
        const pending = env.pEntries(path);
        const busy = pending.find(p => p.got.equals(got.sid));
        if (busy && !file.flags.has('j')) return `${path}: SID ${got.sid} is already being edited by ${busy.user}.`;
        return null;
    }

    /** Release locks (l flag), floor (f) and ceiling (c) for a new delta's release. */
    private releaseRefusal(file: SFile, rel: number, path: string): string | null {
        const locked = file.flags.get('l');
        if (locked !== undefined && (locked === 'a' || locked.split(',').map(Number).includes(rel))) return `${path}: Release ${rel} is locked.`;
        const floor = parseInt(file.flags.get('f') ?? '', 10);
        const ceiling = parseInt(file.flags.get('c') ?? '', 10);
        if (!isNaN(floor) && rel < floor) return `${path}: Release ${rel} is below the floor (${floor}).`;
        if (!isNaN(ceiling) && rel > ceiling) return `${path}: Release ${rel} is above the ceiling (${ceiling}).`;
        return null;
    }

    /** The l-file: one entry per delta, '*' marking deltas not applied. */
    private summary(file: SFile, applied: Set<number>): string {
        let out = '';
        for (const d of file.live) {
            out += `${applied.has(d.serial) ? ' ' : '*'}   ${d.sid}\t${d.date} ${d.time} ${d.user}\n`;
            for (const c of d.comments) out += `\t${c}\n`;
            out += '\n';
        }
        return out;
    }
}
