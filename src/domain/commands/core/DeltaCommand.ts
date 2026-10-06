/**
 * delta - make a delta (change) to an SCCS file (POSIX):
 *   delta [-nps] [-g list] [-m mrlist] [-r SID] [-y[comment]] file...
 *
 * Compares the g-file (edited after `get -e`) with the version it was
 * retrieved from, weaves the differences into the s-file as the SID
 * reserved in the p-file, removes the p-file entry and, unless -n, the
 * g-file. Without -y the comment is read from standard input (lines
 * continued with a trailing backslash; prompted with "comments? " on a
 * terminal). -p shows the differences in diff(1) format; -g records
 * deltas to ignore; -s suppresses the SID and line counts.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext, getStdinAsString } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { isTty } from '../../services/shell/io/IOContext';
import { Utility } from '../shared/Utility';
import { readInput } from '../shared/InputFiles';
import { SOH } from './sccs/SFile';
import { Sid } from './sccs/Sid';
import { addDelta } from './sccs/SccsWeave';
import { normalDiff } from './sccs/LineDiff';
import { hasKeywords } from './sccs/SccsKeywords';
import { SccsEnv, SccsOptions, sccsOptions, optValue, stamp, serialList, PEntry } from './sccs/SccsSupport';
import { SccsReport } from './sccs/SccsReport';

export class DeltaCommand extends Utility {
    readonly utility = 'delta';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const o = sccsOptions(args, 'r:snpg:m:y::');
        if (o.error) return this.usage(state, o.error);
        if (!o.operands.length) return this.usage(state, 'missing file operand');
        const rText = optValue(o, 'r');
        if (rText !== undefined && !Sid.parse(rText)) return this.usage(state, `invalid SID '${rText}'`);
        const env = new SccsEnv(context, state);
        const report = new SccsReport(this.utility);

        let comments: string[] | null = null;
        const readComments = (): string[] => {
            if (comments) return comments;
            const y = optValue(o, 'y');
            if (y !== undefined) return (comments = y ? y.split('\n') : []);
            if (isTty(context.stdin)) report.out += 'comments? ';
            comments = this.continuedLines(getStdinAsString(context) ?? '');
            return comments;
        };

        const files = env.expand(o.operands);
        for (const path of files) {
            if (files.length > 1 && !o.opts.has('s')) report.out += `\n${path}:\n`;
            this.deltaOne(path, o, env, report, readComments, context);
        }
        return report.response(state);
    }

    /** Comment lines: input up to the first newline not escaped with a backslash. */
    private continuedLines(text: string): string[] {
        const out: string[] = [];
        for (const line of text.split('\n')) {
            if (line.endsWith('\\')) { out.push(line.slice(0, -1)); continue; }
            if (line !== '' || out.length) out.push(line);
            break;
        }
        return out;
    }

    private deltaOne(path: string, o: SccsOptions, env: SccsEnv, report: SccsReport, readComments: () => string[], context: ProcessContext): void {
        const loaded = env.load(path);
        if (!loaded.ok) return report.error(loaded.error);
        const file = loaded.file;
        const gname = SccsEnv.gName(path);

        const entries = env.pEntries(path);
        const rText = optValue(o, 'r');
        const want = rText !== undefined ? Sid.parse(rText) : null;
        const mine = entries.filter(p => p.user === env.user && (!want || p.got.equals(want) || p.next.equals(want)));
        if (!mine.length) return report.error(`${path}: ${want ? `SID ${want} is not` : 'No SID is'} locked for editing by you (${env.user}).`);
        if (mine.length > 1) return report.error(`${path}: you have more than one edit outstanding; specify which with -r.`);
        const entry: PEntry = mine[0];
        if (!env.authorized(file)) return report.error(`${path}: You (${env.user}) are not authorised to make deltas.`);
        const got = file.bySid(entry.got);
        if (!got) return report.error(`${path}: SID ${entry.got} (being edited) does not exist.`);

        const input = readInput(context, gname);
        if (!input.ok) return report.error(input.error);
        const newLines = input.data === '' ? [] : input.data.replace(/\n$/, '').split('\n');
        if (newLines.some(l => l.startsWith(SOH))) return report.error(`${gname}: a line begins with SOH (^A); cannot make delta.`);
        if (!hasKeywords(input.data)) {
            if (file.flags.has('i')) return report.error(`${gname}: No id keywords.`);
            report.warn(`${gname}: No id keywords.`);
        }

        let mrs: string[] = [];
        if (o.opts.has('m')) {
            if (!file.flags.has('v')) return report.error(`${path}: MRs are not enabled (no 'v' flag).`);
            mrs = (o.opts.get('m') ?? []).flatMap(m => m.split(/[\s,]+/).filter(Boolean));
        } else if (file.flags.has('v')) return report.error(`${path}: MRs are required (the 'v' flag is set); use -m.`);
        const ignored = serialList(file, optValue(o, 'g') ?? '');
        const included = serialList(file, entry.include);
        const excluded = serialList(file, entry.exclude);
        if (!ignored || !included || !excluded) return report.error(`${path}: invalid delta list`);

        const comments = readComments();
        const serial = file.maxSerial + 1;
        const applied = file.appliedSet(got, included, excluded);
        const woven = addDelta(file.body, applied, newLines, serial);
        file.body = woven.body;
        file.deltas.unshift({
            type: 'D', sid: entry.next, ...stamp(), user: env.user, serial, pred: got.serial,
            inserted: woven.inserted, deleted: woven.deleted, unchanged: woven.unchanged,
            included, excluded, ignored, mrs, comments,
        });
        const saveErr = env.save(path, file);
        if (saveErr) return report.error(saveErr);
        const pErr = env.savePEntries(path, entries.filter(p => p !== entry));
        if (pErr) report.error(pErr);
        if (!o.opts.has('n')) {
            const rmErr = env.remove(gname);
            if (rmErr) report.error(rmErr);
        }

        if (!o.opts.has('s')) {
            report.out += `${entry.next}\n`;
            if (o.opts.has('p')) report.out += normalDiff(woven.old, newLines, woven.hunks);
            report.out += `${woven.inserted} inserted\n${woven.deleted} deleted\n${woven.unchanged} unchanged\n`;
        }
    }
}
