/**
 * sccs - front end for the SCCS subsystem (POSIX):
 *   sccs [-r] [-d path] [-p path] command [options...] [operand...]
 *
 * File operands name g-files and are translated to s-files in the SCCS
 * directory: "f" becomes "SCCS/s.f" ("-p path" replaces SCCS; "-d path",
 * or $PROJECTDIR, is prefixed to relative names). Commands:
 *   admin delta get prs rmdel sact unget val what   run that utility
 *   prt                 prs
 *   edit                get -e
 *   delget / deledit    delta, then get (deledit: get -e)
 *   create              admin -i<file>, keep the original as ",file", then get
 *   unedit              unget
 *   clean               remove g-files that are not being edited
 *   info [-u [user]]    list files being edited
 *   check [-u [user]]   like info, silent and status 1 when anything is edited
 *   tell [-u [user]]    names of files being edited
 *   diffs               differences between g-files and the versions being edited
 *   help                list the commands
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { readInput } from '../shared/InputFiles';
import { DirectoryNode } from '../../entities/filesystem/DirectoryNode';
import { UserDatabase } from '../../services/UserDatabase';
import { extract } from './sccs/SccsWeave';
import { diffLines, normalDiff } from './sccs/LineDiff';
import { SccsEnv, PEntry } from './sccs/SccsSupport';
import { SccsReport } from './sccs/SccsReport';

const PASS_THROUGH: Record<string, string> = {
    admin: 'admin', delta: 'delta', get: 'get', prs: 'prs', prt: 'prs', rmdel: 'rmdel', sact: 'sact',
    unget: 'unget', unedit: 'unget', val: 'val', edit: 'get',
};
const NO_TRANSLATION = new Set(['what']);

const HELP = `usage: sccs [-r] [-d path] [-p path] command [options] [file...]
commands:
  admin  delta  get  prs  prt  rmdel  sact  unget  val  what
  edit      get a file for editing (get -e)
  delget    delta then get
  deledit   delta then get -e
  create    create s-files from existing files
  unedit    unget an edit
  clean     remove g-files not being edited
  info      list files being edited
  check     like info, exit status 1 when anything is being edited
  tell      names of files being edited
  diffs     compare g-files with the versions being edited
`;

interface Layout { prefix: string; sccsDir: string }

export class SccsCommand extends Utility {
    readonly utility = 'sccs';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const layout: Layout = { prefix: '', sccsDir: 'SCCS' };
        let i = 0;
        for (; i < args.length && args[i].startsWith('-') && args[i] !== '-'; i++) {
            const a = args[i];
            if (a === '--') { i++; break; }
            if (a === '-r') continue;
            if (a.startsWith('-d') || a.startsWith('-p')) {
                const value = a.length > 2 ? a.slice(2) : args[++i];
                if (value === undefined) return this.usage(state, `option requires an argument -- '${a[1]}'`);
                if (a[1] === 'd') layout.prefix = value; else layout.sccsDir = value;
                continue;
            }
            return this.usage(state, `invalid option -- '${a.slice(1)}'`);
        }
        const command = args[i];
        const rest = args.slice(i + 1);
        if (command === undefined) return this.usage(state, `missing command\n${HELP.trimEnd()}`);
        if (!layout.prefix) layout.prefix = this.projectDir(context);

        const env = new SccsEnv(context, state);
        const report = new SccsReport(this.utility);
        const translate = (list: string[]) => list.map(a => (a.startsWith('-') ? a : this.sfileName(a, layout, env)));
        const run = async (argv: string[]): Promise<number> => {
            if (!context.spawn) { report.error('cannot run utilities here', 126); return 126; }
            return context.spawn(argv);
        };

        switch (command) {
            case 'help':
                report.out += HELP;
                break;
            case 'delget':
            case 'deledit': {
                const status = await run(['delta', ...translate(rest)]);
                const files = translate(rest.filter(a => !a.startsWith('-')));
                report.status = status || await run(command === 'delget' ? ['get', ...files] : ['get', '-e', ...files]);
                break;
            }
            case 'create':
                report.status = await this.create(rest, layout, env, report, run, context);
                break;
            case 'clean':
                this.clean(layout, env, report);
                break;
            case 'info':
            case 'check':
            case 'tell':
                this.editing(command, rest, layout, env, report);
                break;
            case 'diffs':
                this.diffs(rest, layout, env, report, context);
                break;
            default: {
                if (NO_TRANSLATION.has(command)) { report.status = await run([command, ...rest]); break; }
                const util = PASS_THROUGH[command];
                if (!util) { report.error(`Unknown command "${command}"`); break; }
                const extra = command === 'edit' ? ['-e'] : [];
                report.status = await run([util, ...extra, ...translate(rest)]);
            }
        }
        return report.response(state);
    }

    /** $PROJECTDIR: an absolute directory, or a user whose ~/src (or ~/source) holds the project. */
    private projectDir(context: ProcessContext): string {
        const dir = context.env.PROJECTDIR;
        if (!dir) return '';
        if (dir.startsWith('/')) return dir;
        const home = new UserDatabase(context.fileSystemService).byName(dir)?.home;
        if (!home) return '';
        const node = context.fileSystemService.resolve(`${home}/src`, '/');
        return node ? `${home}/src` : `${home}/source`;
    }

    /** Maps a g-file (or s-file) operand to its s-file path. */
    private sfileName(arg: string, layout: Layout, env: SccsEnv): string {
        const full = arg.startsWith('/') || !layout.prefix ? arg : `${layout.prefix.replace(/\/$/, '')}/${arg}`;
        const slash = full.lastIndexOf('/');
        const dir = full.slice(0, slash + 1);
        const base = full.slice(slash + 1);
        if (base.startsWith('s.')) {
            if (env.exists(full) || dir.replace(/\/$/, '').endsWith(layout.sccsDir)) return full;
            return `${dir}${layout.sccsDir}/${base}`;
        }
        if (base && env.isDir(full)) return `${full.replace(/\/$/, '')}/${layout.sccsDir}`;
        return `${dir}${layout.sccsDir}/s.${base}`;
    }

    /** The SCCS directory (with prefix) of the current project. */
    private sccsDirectory(layout: Layout): string {
        return layout.prefix ? `${layout.prefix.replace(/\/$/, '')}/${layout.sccsDir}` : layout.sccsDir;
    }

    /** s-files in the SCCS directory. */
    private sfiles(layout: Layout, env: SccsEnv): string[] {
        const dir = this.sccsDirectory(layout);
        const node = env.fs.resolve(env.abs(dir), '/');
        if (!(node instanceof DirectoryNode)) return [];
        return [...node.children.keys()].filter(n => n.startsWith('s.')).sort().map(n => `${dir}/${n}`);
    }

    private async create(rest: string[], layout: Layout, env: SccsEnv, report: SccsReport, run: (argv: string[]) => Promise<number>, context: ProcessContext): Promise<number> {
        const options = rest.filter(a => a.startsWith('-'));
        const files = rest.filter(a => !a.startsWith('-'));
        if (!files.length) { report.error('create: missing file operand'); return 1; }
        let status = 0;
        for (const g of files) {
            const sfile = this.sfileName(g, layout, env);
            const sdir = sfile.slice(0, sfile.lastIndexOf('/'));
            if (sdir && !env.exists(sdir)) {
                try { env.fs.mkdir(env.abs(sdir), 0o777 & ~env.umask, context.user.uid, context.user.gid, '/'); } catch { /* admin reports */ }
            }
            const s = await run(['admin', `-i${g}`, ...options, sfile]);
            if (s) { status = s; continue; }
            const slash = g.lastIndexOf('/');
            const saved = g.slice(0, slash + 1) + ',' + g.slice(slash + 1);
            try {
                env.fs.rename(env.abs(g), env.abs(saved), '/');
            } catch {
                report.error(`create: cannot rename ${g} to ${saved}`);
                status = 1;
                continue;
            }
            status = (await run(['get', sfile])) || status;
        }
        return status;
    }

    private clean(layout: Layout, env: SccsEnv, report: SccsReport): void {
        for (const s of this.sfiles(layout, env)) {
            const g = SccsEnv.gName(s);
            if (env.pEntries(s).length || !env.exists(g)) continue;
            const err = env.remove(g);
            if (err) report.error(err);
        }
    }

    /** info / check / tell over the files being edited (optionally by one user: -u [user]). */
    private editing(command: string, rest: string[], layout: Layout, env: SccsEnv, report: SccsReport): void {
        let user: string | undefined;
        const u = rest.findIndex(a => a.startsWith('-u'));
        if (u >= 0) user = rest[u].length > 2 ? rest[u].slice(2) : rest[u + 1] && !rest[u + 1].startsWith('-') ? rest[u + 1] : env.user;
        const edits: [string, PEntry][] = [];
        for (const s of this.sfiles(layout, env)) {
            for (const p of env.pEntries(s)) if (!user || p.user === user) edits.push([SccsEnv.gName(s), p]);
        }
        if (command === 'tell') {
            report.out += [...new Set(edits.map(([g]) => g))].map(g => g + '\n').join('');
            return;
        }
        if (command === 'info' && !edits.length) {
            report.out += 'Nothing being edited\n';
            return;
        }
        for (const [g, p] of edits) report.out += `${g.padStart(12)}: being edited: ${p.got} ${p.next} ${p.user} ${p.date} ${p.time}\n`;
        if (command === 'check' && edits.length) report.status = 1;
    }

    /** diffs: each edited g-file against the version it was gotten from. */
    private diffs(rest: string[], layout: Layout, env: SccsEnv, report: SccsReport, context: ProcessContext): void {
        const files = rest.filter(a => !a.startsWith('-'));
        const targets = files.length ? files.map(f => this.sfileName(f, layout, env)) : this.sfiles(layout, env).filter(s => env.pEntries(s).length);
        for (const s of targets) {
            const loaded = env.load(s);
            if (!loaded.ok) { report.error(loaded.error); continue; }
            const g = SccsEnv.gName(s);
            const mine = env.pEntries(s).filter(p => p.user === env.user);
            const entry = mine[0];
            const base = entry ? loaded.file.bySid(entry.got) : loaded.file.live[0];
            if (!base) continue;
            const input = readInput(context, g);
            if (!input.ok) { report.error(input.error); continue; }
            const old = extract(loaded.file.body, loaded.file.appliedSet(base)).lines;
            const now = input.data === '' ? [] : input.data.replace(/\n$/, '').split('\n');
            const hunks = diffLines(old, now);
            if (!hunks.length) continue;
            report.out += `\n------- ${g} -------\n` + normalDiff(old, now, hunks);
        }
    }
}
