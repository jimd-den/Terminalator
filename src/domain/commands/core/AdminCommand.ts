/**
 * admin - create and administer SCCS files (POSIX):
 *   admin -i[name] [-n] [-a login] [-d flag] [-e login] [-f flag] [-m mrlist]
 *         [-r rel] [-t[name]] [-y[comment]] newfile
 *   admin -n [-a login] [-d flag] [-e login] [-f flag] [-m mrlist]
 *         [-t[name]] [-y[comment]] newfile...
 *   admin [-a login] [-d flag] [-m mrlist] [-r rel] [-t[name]] file...
 *   admin -h file...      check the checksum and structure
 *   admin -z file...      recompute the checksum
 *
 * -i takes the initial text from a file (standard input when no name is
 * attached); -n creates an empty file. Flags (-f/-d): b, c ceil, d SID,
 * f floor, i[str], j, l list|a, m module, n, q text, t type, v[pgm], e 0|1.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext, getStdinAsString } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { readInput } from '../shared/InputFiles';
import { SFile, SOH, parseSFile } from './sccs/SFile';
import { Sid } from './sccs/Sid';
import { hasKeywords } from './sccs/SccsKeywords';
import { SccsEnv, SccsOptions, sccsOptions, optValue, stamp } from './sccs/SccsSupport';
import { SccsReport } from './sccs/SccsReport';

const VALUE_FLAGS = new Set(['c', 'd', 'f', 'l', 'm', 'q', 't']);
const OPTIONAL_VALUE_FLAGS = new Set(['i', 'v', 'e']);
const BOOLEAN_FLAGS = new Set(['b', 'j', 'n']);

export class AdminCommand extends Utility {
    readonly utility = 'admin';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const o = sccsOptions(args, 'i::nr:t::f:d:a:e:m:y::hz');
        if (o.error) return this.usage(state, o.error);
        if (!o.operands.length) return this.usage(state, 'missing file operand');
        const env = new SccsEnv(context, state);
        const report = new SccsReport(this.utility);
        const has = (c: string) => o.opts.has(c);
        const creating = has('i') || has('n');
        if (has('i') && o.operands.length > 1) return this.usage(state, 'only one file may be created with -i');
        if (has('r') && !has('i')) return this.usage(state, 'the -r option may be used only with -i');
        if (creating && has('t') && optValue(o, 't') === '') return this.usage(state, 'the -t option must have an argument if -n or -i is used');

        for (const path of creating ? o.operands : env.expand(o.operands)) {
            if (!SccsEnv.isSccsName(path)) { report.error(`${path}: not an SCCS file (names must begin with "s.")`); continue; }
            if (has('h')) this.check(path, env, report);
            else if (creating) this.create(path, o, env, report, context);
            else this.modify(path, o, env, report);
        }
        return report.response(state);
    }

    /** admin -h: verify checksum and structure. */
    private check(path: string, env: SccsEnv, report: SccsReport): void {
        const text = env.read(path);
        if (text === null) return report.error(`${path}: No such file or directory`);
        const parsed = parseSFile(text);
        if (!parsed.ok) return report.error(`${path}: ${parsed.error}`);
        if (!parsed.file.checksumOk) report.error(`${path}: corrupted SCCS file (bad checksum: expected ${parsed.file.storedChecksum}, calculated ${parsed.file.computedChecksum})`);
    }

    private create(path: string, o: SccsOptions, env: SccsEnv, report: SccsReport, context: ProcessContext): void {
        if (env.exists(path)) return report.error(`${path}: file exists`);
        const file = new SFile();
        const flagError = this.applyFlags(file, o) ?? this.applyUsers(file, o);
        if (flagError) return report.error(`${path}: ${flagError}`);

        let text = '';
        if (o.opts.has('i')) {
            const name = optValue(o, 'i')!;
            if (name) {
                const input = readInput(context, name);
                if (!input.ok) return report.error(input.error);
                text = input.data;
            } else text = getStdinAsString(context) ?? '';
        }
        const lines = text === '' ? [] : text.replace(/\n$/, '').split('\n');
        if (lines.some(l => l.startsWith(SOH))) return report.error(`${path}: input file contains a line beginning with SOH (^A)`);
        if (o.opts.has('i') && !hasKeywords(text)) {
            if (file.flags.has('i')) return report.error(`${path}: No id keywords.`);
            report.warn(`${path}: No id keywords.`);
        }

        const rel = optValue(o, 'r');
        const sid = rel !== undefined ? Sid.parse(rel) : new Sid(1, 1);
        if (!sid || (rel !== undefined && sid.depth > 2)) return report.error(`${path}: invalid release '${rel}'`);
        const mrError = this.mrs(file, o);
        if (mrError) return report.error(`${path}: ${mrError}`);
        const now = stamp();
        const comment = optValue(o, 'y');
        file.deltas.push({
            type: 'D', sid: sid.depth === 1 ? new Sid(sid.rel, 1) : sid, ...now, user: env.user, serial: 1, pred: 0,
            inserted: lines.length, deleted: 0, unchanged: 0, included: [], excluded: [], ignored: [],
            mrs: (o.opts.get('m') ?? []).flatMap(m => m.split(/[\s,]+/).filter(Boolean)),
            comments: comment !== undefined ? (comment ? comment.split('\n') : []) : [`date and time created ${now.date} ${now.time} by ${env.user}`],
        });
        const descError = this.description(file, o, context);
        if (descError) return report.error(descError);
        file.body = [`${SOH}I 1`, ...lines, `${SOH}E 1`];
        const err = env.save(path, file);
        if (err) report.error(err);
    }

    private modify(path: string, o: SccsOptions, env: SccsEnv, report: SccsReport): void {
        const loaded = env.load(path, o.opts.has('z'));
        if (!loaded.ok) return report.error(loaded.error);
        const file = loaded.file;
        if (o.opts.has('m')) return report.error(`${path}: the -m option is only valid when creating a file`);
        const error = this.applyFlags(file, o) ?? this.applyUsers(file, o) ?? this.description(file, o, env.context);
        if (error) return report.error(error.startsWith(path) ? error : `${path}: ${error}`);
        const err = env.save(path, file);
        if (err) report.error(err);
    }

    /** -f flag[value] sets and -d flag[value] deletes header flags. */
    private applyFlags(file: SFile, o: SccsOptions): string | null {
        for (const spec of o.opts.get('f') ?? []) {
            const flag = spec[0], value = spec.slice(1);
            if (!flag) return 'missing flag';
            if (VALUE_FLAGS.has(flag)) {
                if (!value) return `flag '${flag}' requires a value`;
                if ((flag === 'c' || flag === 'f') && !/^[1-9][0-9]*$/.test(value)) return `invalid release '${value}' for flag '${flag}'`;
                if (flag === 'd' && !Sid.parse(value)) return `invalid SID '${value}'`;
                if (flag === 'l' && value !== 'a' && !/^[0-9]+(,[0-9]+)*$/.test(value)) return `invalid release list '${value}'`;
                if (flag === 'l' && value !== 'a' && file.flags.has('l') && file.flags.get('l') !== 'a') {
                    const merged = new Set([...file.flags.get('l')!.split(','), ...value.split(',')]);
                    file.flags.set('l', [...merged].map(Number).sort((a, b) => a - b).join(','));
                    continue;
                }
                file.flags.set(flag, value);
            } else if (OPTIONAL_VALUE_FLAGS.has(flag)) {
                if (flag === 'e' && value !== '' && value !== '0' && value !== '1') return `invalid value '${value}' for flag 'e'`;
                file.flags.set(flag, value);
            } else if (BOOLEAN_FLAGS.has(flag)) {
                if (value) return `flag '${flag}' takes no value`;
                file.flags.set(flag, '');
            } else return `unknown flag '${flag}'`;
        }
        for (const spec of o.opts.get('d') ?? []) {
            const flag = spec[0], value = spec.slice(1);
            if (!VALUE_FLAGS.has(flag) && !OPTIONAL_VALUE_FLAGS.has(flag) && !BOOLEAN_FLAGS.has(flag)) return `unknown flag '${flag}'`;
            if (flag === 'l' && value && value !== 'a') {
                const current = file.flags.get('l');
                if (current === 'a') return `cannot unlock release ${value}: all releases are locked (use -dla)`;
                const keep = (current ?? '').split(',').filter(r => r && !value.split(',').includes(r));
                if (keep.length) file.flags.set('l', keep.join(',')); else file.flags.delete('l');
                continue;
            }
            file.flags.delete(flag);
        }
        return null;
    }

    /** -a adds and -e removes users (login names or numeric group ids). */
    private applyUsers(file: SFile, o: SccsOptions): string | null {
        for (const v of o.opts.get('a') ?? []) {
            for (const u of v.split(/[\s,]+/).filter(Boolean)) if (!file.users.includes(u)) file.users.push(u);
        }
        for (const v of o.opts.get('e') ?? []) {
            const gone = v.split(/[\s,]+/).filter(Boolean);
            file.users = file.users.filter(u => !gone.includes(u));
        }
        return null;
    }

    /** -m is allowed only when MR validation (v flag) is on. */
    private mrs(file: SFile, o: SccsOptions): string | null {
        if (o.opts.has('m') && !file.flags.has('v')) return "MRs not enabled with the 'v' flag";
        return null;
    }

    /** -t[name]: replace the descriptive text (removed when no name is given). */
    private description(file: SFile, o: SccsOptions, context: ProcessContext): string | null {
        if (!o.opts.has('t')) return null;
        const name = optValue(o, 't')!;
        if (!name) { file.description = []; return null; }
        const input = readInput(context, name);
        if (!input.ok) return input.error;
        file.description = input.data === '' ? [] : input.data.replace(/\n$/, '').split('\n');
        return null;
    }
}
