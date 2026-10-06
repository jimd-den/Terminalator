/**
 * tar - tape archiver (GNU tar compatible, ustar format):
 *
 *   tar -c [-vhzZP] [-f archive] [-b blocks] [-C dir] file...
 *   tar -r|-u [-vh] -f archive [-C dir] file...
 *   tar -t [-vzZ] [-f archive] [member...]
 *   tar -x [-vzZkmpoO] [-f archive] [-C dir] [member...]
 *
 * Also the traditional bundled form (`tar cvf a.tar dir`) and the GNU long
 * options (--create, --file=F, --directory=D, --gzip, ...). Archives are
 * written as GNU tar --format=ustar writes them; compressed archives are
 * recognised automatically when reading. Exit status: 0 success,
 * 2 fatal error or some members could not be processed.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { readInputBytes } from '../shared/InputFiles';
import { statPath } from '../shared/FileInfo';
import { autoDecompress } from '../shared/Compression';
import { ArchiveCollector, ArchiveExtractor, NameCache, writeArchive } from '../shared/ArchiveFs';
import { TarLister } from '../shared/ArchiveListing';
import { ArchiveEntry, concatBytes } from '../../utils/ArchiveEntry';
import { encodeEntry, decodeArchive, trailer, BLOCK, UstarError } from '../../utils/Ustar';
import { gzipEncode, isGzip } from '../../utils/Gzip';
import { lzwCompress, isCompressed } from '../../utils/Lzw';
import { isTty } from '../../services/shell/io/IOContext';
import { bytesToBinaryString, decodeStream } from '../../services/shell/io/OutputSink';

type Mode = 'c' | 'r' | 'u' | 't' | 'x';

interface TarOptions {
    mode?: Mode;
    modeCount: number;
    archive?: string;
    verbose: number;
    gzip: boolean;
    compress: boolean;
    follow: boolean;
    absolute: boolean;
    keepOld: boolean;
    touch: boolean;
    preservePerms?: boolean;
    sameOwner?: boolean;
    toStdout: boolean;
    blocking: number;
    /** File operands with the -C directory in effect where they appeared. */
    files: { name: string; dir: string }[];
    dir: string;
}

class Fatal extends Error { }

const USAGE_HINT = "Try 'tar --help' or 'tar --usage' for more information.";
const ARG_LETTERS = 'fCb';

export class TarCommand extends Utility {
    readonly utility = 'tar';
    readonly capabilities = [CommandCapability.MODIFY];

    private stderr: string[] = [];
    private failed = false;

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        this.stderr = [];
        this.failed = false;
        let opts: TarOptions;
        try {
            opts = this.parse(args, context);
        } catch (e: any) {
            return this.done(state, '', [`tar: ${e.message}`, USAGE_HINT], 2);
        }
        if (opts.modeCount === 0) return this.done(state, '', ["tar: You must specify one of the '-Acdtrux', '--delete' or '--test-label' options", USAGE_HINT], 2);
        if (opts.modeCount > 1) return this.done(state, '', ["tar: You may not specify more than one '-Acdtrux', '--delete' or '--test-label' option", USAGE_HINT], 2);

        try {
            switch (opts.mode) {
                case 'c': return this.create(opts, context, state);
                case 'r':
                case 'u': return this.append(opts, context, state);
                default: return this.read(opts, context, state);
            }
        } catch (e: any) {
            if (!(e instanceof Fatal)) throw e;
            if (e.message) this.stderr.push(`tar: ${e.message}`);
            this.stderr.push('tar: Error is not recoverable: exiting now');
            return this.done(state, '', [], 2);
        }
    }

    // ------------------------------------------------------------ options

    private parse(args: string[], context: ProcessContext): TarOptions {
        const o: TarOptions = {
            modeCount: 0, verbose: 0, gzip: false, compress: false, follow: false, absolute: false, keepOld: false,
            touch: false, toStdout: false, blocking: 20, files: [], dir: context.cwd,
        };
        const setMode = (m: Mode) => { if (o.mode !== m) o.modeCount++; o.mode = m; };
        const short = (c: string, value?: string) => {
            switch (c) {
                case 'c': case 'r': case 'u': case 't': case 'x': setMode(c); break;
                case 'f': o.archive = value; break;
                case 'C': o.dir = context.fileSystemService.resolveAbsolutePath(value!, o.dir); break;
                case 'b': {
                    const n = Number(value);
                    if (!Number.isInteger(n) || n < 1) throw new Error(`${value}: Invalid blocking factor`);
                    o.blocking = n;
                    break;
                }
                case 'v': o.verbose++; break;
                case 'z': o.gzip = true; break;
                case 'Z': o.compress = true; break;
                case 'h': o.follow = true; break;
                case 'P': o.absolute = true; break;
                case 'k': o.keepOld = true; break;
                case 'm': o.touch = true; break;
                case 'p': o.preservePerms = true; break;
                case 'o': o.sameOwner = false; break;
                case 'O': o.toStdout = true; break;
                default: throw new Error(`invalid option -- '${c}'`);
            }
        };
        const long: Record<string, [string, boolean]> = {
            create: ['c', false], append: ['r', false], update: ['u', false], list: ['t', false], extract: ['x', false], get: ['x', false],
            file: ['f', true], directory: ['C', true], 'blocking-factor': ['b', true], verbose: ['v', false], gzip: ['z', false],
            gunzip: ['z', false], ungzip: ['z', false], compress: ['Z', false], uncompress: ['Z', false], dereference: ['h', false],
            'absolute-names': ['P', false], 'keep-old-files': ['k', false], touch: ['m', false], 'preserve-permissions': ['p', false],
            'same-permissions': ['p', false], 'no-same-owner': ['o', false], 'to-stdout': ['O', false],
        };

        let i = 0;
        // Traditional form: the first argument is a cluster of key letters without '-'.
        if (args.length && !args[0].startsWith('-')) {
            const letters = args[0];
            i = 1;
            for (const c of letters) {
                if (ARG_LETTERS.includes(c)) {
                    if (i >= args.length) throw new Error(`option requires an argument -- '${c}'`);
                    short(c, args[i++]);
                } else short(c);
            }
        }
        let operandsOnly = false;
        for (; i < args.length; i++) {
            const a = args[i];
            if (operandsOnly || !a.startsWith('-') || a === '-') { o.files.push({ name: a, dir: o.dir }); continue; }
            if (a === '--') { operandsOnly = true; continue; }
            if (a.startsWith('--')) {
                const eq = a.indexOf('=');
                const key = a.slice(2, eq < 0 ? undefined : eq);
                if (key === 'format' || key === 'numeric-owner' || key === 'overwrite') continue;
                if (key === 'same-owner') { o.sameOwner = true; continue; }
                const match = Object.keys(long).filter(k => k.startsWith(key));
                const name = long[key] ? key : match.length === 1 ? match[0] : null;
                if (!name) throw new Error(`unrecognized option '${a}'`);
                const [c, takes] = long[name];
                if (takes) {
                    const value = eq >= 0 ? a.slice(eq + 1) : args[++i];
                    if (value === undefined) throw new Error(`option '--${name}' requires an argument`);
                    short(c, value);
                } else short(c);
                continue;
            }
            for (let j = 1; j < a.length; j++) {
                const c = a[j];
                if (ARG_LETTERS.includes(c)) {
                    const value = j + 1 < a.length ? a.slice(j + 1) : args[++i];
                    if (value === undefined) throw new Error(`option requires an argument -- '${c}'`);
                    short(c, value);
                    break;
                }
                short(c);
            }
        }
        o.archive ??= '-';
        return o;
    }

    // ------------------------------------------------------------ helpers

    private done(state: TerminalState, output: string, extra: string[], status?: number, binary = false): CommandResponse {
        const lines = [...this.stderr, ...extra];
        const code = status ?? (this.failed ? 2 : 0);
        if (this.failed && status === undefined) lines.push('tar: Exiting with failure status due to previous errors');
        return { output, binary: binary || undefined, stderr: lines.length ? lines.join('\n') + '\n' : undefined, exitCode: code, newState: state };
    }

    private error(msg: string): void {
        this.stderr.push(`tar: ${msg}`);
        this.failed = true;
    }

    private warnOnce = new Set<string>();
    private warn(msg: string): void {
        if (this.warnOnce.has(msg)) return;
        this.warnOnce.add(msg);
        this.stderr.push(`tar: ${msg}`);
    }

    /** Strips leading '/' and '../' parts from a member name (unless -P), as GNU tar does. */
    private safeName(name: string, opts: TarOptions, what = 'member names'): string {
        if (opts.absolute) return name;
        const m = /^(?:.*(?:^|\/)\.\.(?:\/|$))|^\/+/.exec(name);
        if (!m || !m[0]) return name;
        const prefix = m[0];
        this.warn(`Removing leading \`${prefix}' from ${what}`);
        return name.slice(prefix.length) || '.';
    }

    private readArchiveBytes(opts: TarOptions, context: ProcessContext): Uint8Array {
        if (opts.archive === '-' && isTty(context.stdin)) throw new Fatal('Refusing to read archive contents from terminal (missing -f option?)');
        const input = readInputBytes(context, opts.archive);
        if (!input.ok) throw new Fatal(input.error.replace(/: ([^:]*)$/, ': Cannot open: $1'));
        const expanded = autoDecompress(input.data);
        if (!expanded.ok) {
            this.stderr.push(`${expanded.error.includes('gzip') ? 'gzip' : 'tar'}: ${opts.archive === '-' ? 'stdin' : opts.archive}: ${expanded.error}`, 'tar: Child returned status 1');
            throw new Fatal('');
        }
        return expanded.data;
    }

    private compressArchive(bytes: Uint8Array, opts: TarOptions): Uint8Array {
        if (opts.gzip) return gzipEncode(bytes, { level: 6 });
        if (opts.compress) return lzwCompress(bytes, 16);
        return bytes;
    }

    // ------------------------------------------------------------ create / append

    private gather(opts: TarOptions, context: ProcessContext, archiveIno: number | null, existing?: ArchiveEntry[]): ArchiveEntry[] {
        const collector = new ArchiveCollector(context, {
            follow: opts.follow, hardlinks: true,
            skip: (_abs, info) => (archiveIno !== null && info.inode.id === archiveIno ? 'file is the archive; not dumped' : null),
        });
        const latest = new Map<string, number>();
        for (const e of existing ?? []) latest.set(e.name, Math.max(latest.get(e.name) ?? -Infinity, e.mtime));
        const out: ArchiveEntry[] = [];
        const lister = new TarLister();
        for (const file of opts.files) {
            const operand = file.name.length > 1 ? file.name.replace(/\/+$/, '') : file.name;
            const member = this.safeName(operand.replace(/\/{2,}/g, '/'), opts);
            collector.collect(operand, file.dir, (entry) => {
                const name = this.safeName(entry.name, opts);
                const e: ArchiveEntry = { ...entry, name };
                if (e.kind === 'hardlink') e.linkname = this.safeName(e.linkname, opts, 'hard link targets');
                if (opts.mode === 'u' && latest.has(name) && latest.get(name)! >= e.mtime) return;
                try { encodeEntry(e); } catch (err) {
                    if (err instanceof UstarError) { this.error(`${e.name}: ${err.message}`); return; }
                    throw err;
                }
                out.push(e);
                if (opts.verbose) this.verboseLine(opts, opts.verbose > 1 ? lister.line(e) : e.kind === 'dir' ? `${e.name}/` : e.name);
            }, (err) => {
                if (err.reason === 'file is the archive; not dumped') { this.stderr.push(`tar: ${err.path}: ${err.reason}`); return; }
                const op = err.op === 'stat' ? 'Cannot stat' : err.op === 'opendir' ? 'Cannot open' : err.op === 'readlink' ? 'Cannot readlink' : 'Cannot open';
                this.error(`${err.path}: ${op}: ${err.reason}`);
            }, member);
        }
        return out;
    }

    private verboseOut: string[] = [];
    private verboseLine(opts: TarOptions, line: string): void {
        // With the archive on stdout, the listing goes to stderr.
        if (opts.archive === '-' && (opts.mode === 'c' || opts.mode === 'r' || opts.mode === 'u')) this.stderr.push(line);
        else this.verboseOut.push(line);
    }

    private create(opts: TarOptions, context: ProcessContext, state: TerminalState): CommandResponse {
        this.verboseOut = [];
        if (opts.files.length === 0) return this.done(state, '', ['tar: Cowardly refusing to create an empty archive', USAGE_HINT], 2);
        const toStdout = opts.archive === '-';
        if (toStdout && context.stdoutIsTty === true) throw new Fatal('Refusing to write archive contents to terminal (missing -f option?)');
        let archiveIno: number | null = null;
        if (!toStdout) {
            const err = writeArchive(context, state.umask ?? 0o022, opts.archive!, new Uint8Array(0));
            if (err) throw new Fatal(`${opts.archive}: Cannot open: ${err}`);
            archiveIno = statPath(context, opts.archive!)?.inode.id ?? null;
        }
        const entries = this.gather(opts, context, archiveIno);
        const body = concatBytes(entries.map(encodeEntry));
        const bytes = this.compressArchive(concatBytes([body, trailer(body.length, opts.blocking * BLOCK)]), opts);
        if (toStdout) return this.done(state, bytesToBinaryString(bytes), [], undefined, true);
        const err = writeArchive(context, state.umask ?? 0o022, opts.archive!, bytes);
        if (err) throw new Fatal(`${opts.archive}: Cannot write: ${err}`);
        return this.done(state, this.verboseText(), []);
    }

    private verboseText(): string {
        return this.verboseOut.length ? this.verboseOut.join('\n') + '\n' : '';
    }

    private append(opts: TarOptions, context: ProcessContext, state: TerminalState): CommandResponse {
        this.verboseOut = [];
        if (opts.archive === '-') return this.done(state, '', ["tar: Options '-Aru' are incompatible with '-f -'", USAGE_HINT], 2);
        if (opts.gzip || opts.compress) throw new Fatal('Cannot update compressed archives');
        let old = new Uint8Array(0);
        const info = statPath(context, opts.archive!);
        if (info) {
            const input = readInputBytes(context, opts.archive);
            if (!input.ok) throw new Fatal(input.error.replace(/: ([^:]*)$/, ': Cannot open: $1'));
            if (isGzip(input.data) || isCompressed(input.data)) throw new Fatal('Cannot update compressed archives');
            old = new Uint8Array(input.data);
        }
        const parsed = decodeArchive(old);
        if (parsed.error && parsed.entries.length === 0 && old.length) throw new Fatal(parsed.error);
        const entries = this.gather(opts, context, info?.inode.id ?? null, parsed.entries);
        const body = concatBytes([old.subarray(0, parsed.end), ...entries.map(encodeEntry)]);
        const bytes = concatBytes([body, trailer(body.length, opts.blocking * BLOCK)]);
        const err = writeArchive(context, state.umask ?? 0o022, opts.archive!, bytes);
        if (err) throw new Fatal(`${opts.archive}: Cannot open: ${err}`);
        return this.done(state, this.verboseText(), []);
    }

    // ------------------------------------------------------------ list / extract

    private read(opts: TarOptions, context: ProcessContext, state: TerminalState): CommandResponse {
        this.verboseOut = [];
        const bytes = this.readArchiveBytes(opts, context);
        const parsed = decodeArchive(bytes);
        return this.readEntries(parsed.entries, parsed.error, opts, context, state);
    }

    private readEntries(entries: ArchiveEntry[], damage: string | undefined, opts: TarOptions, context: ProcessContext, state: TerminalState): CommandResponse {
        const patterns = opts.files.map(f => f.name.length > 1 ? f.name.replace(/\/+$/, '') : f.name);
        const matched = new Set<string>();
        const selected = (name: string) => {
            if (!patterns.length) return true;
            const hit = patterns.find(p => name === p || name.startsWith(p + '/'));
            if (hit !== undefined) matched.add(hit);
            return hit !== undefined;
        };
        const lister = new TarLister();
        const names = new NameCache(context.fileSystemService);
        const root = context.user.uid === 0;
        const extractor = opts.mode === 'x' && !opts.toStdout ? new ArchiveExtractor(context, {
            baseDir: opts.dir,
            umask: state.umask ?? 0o022,
            preservePerms: opts.preservePerms ?? root,
            preserveOwner: opts.sameOwner ?? root,
            restoreMtime: !opts.touch,
            existing: opts.keepOld ? 'keep' : 'replace',
            makeParents: true,
        }) : null;
        if (extractor && !statPath(context, opts.dir)) throw new Fatal(`${opts.dir}: Cannot open: No such file or directory`);
        const data: Uint8Array[] = [];

        for (const e of entries) {
            if (!selected(e.name)) continue;
            if (opts.mode === 't') {
                this.verboseOut.push(opts.verbose ? lister.line(e, names) : e.kind === 'dir' ? `${e.name}/` : e.name);
                continue;
            }
            if (opts.verbose) this.verboseOut.push(opts.verbose > 1 ? lister.line(e, names) : e.kind === 'dir' ? `${e.name}/` : e.name);
            if (opts.toStdout) { if (e.kind === 'file') data.push(e.data); continue; }
            const name = this.safeName(e.name, opts);
            if (!opts.absolute && name.split('/').includes('..')) { this.error(`${e.name}: Member name contains '..'`); continue; }
            const member = { ...e, linkname: e.kind === 'hardlink' ? this.safeName(e.linkname, opts, 'hard link targets') : e.linkname };
            const res = extractor!.extract(member, name);
            if (!res.ok) {
                const what = res.op === 'mkdir' ? 'Cannot mkdir' : res.op === 'link' ? `Cannot hard link to '${member.linkname}'`
                    : res.op === 'symlink' ? `Cannot create symlink to '${member.linkname}'` : res.op === 'mknod' ? 'Cannot mknod' : 'Cannot open';
                this.error(`${name}: ${what}: ${res.reason}`);
            }
        }
        extractor?.finish();
        for (const p of patterns) if (!matched.has(p)) this.error(`${p}: Not found in archive`);
        if (damage) this.error(damage);

        if (opts.toStdout) {
            const { text, binary } = decodeStream(concatBytes(data));
            if (opts.verbose) this.stderr.unshift(...this.verboseOut);
            return this.done(state, text, [], undefined, binary);
        }
        return this.done(state, this.verboseText(), []);
    }
}
