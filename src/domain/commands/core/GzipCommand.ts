/**
 * gzip, gunzip, zcat - compress or expand files (GNU gzip compatible):
 *
 *   gzip   [-cdfklnNqrtv1-9] [-S suffix] [file...]
 *   gunzip [-cfklnNqrtv] [-S suffix] [file...]     (gzip -d)
 *   zcat   [-fq] [file...]                         (gzip -dc)
 *
 * Real DEFLATE (utils/Deflate) in the gzip format (utils/Gzip); expanding
 * also understands compress(1) .Z data. A file is replaced by file.gz (and
 * back) keeping its mode, owner and modification time; existing outputs are
 * not overwritten without -f. -l lists sizes and ratios, -t tests integrity.
 * Exit status: 0 success, 1 error, 2 warning (when no error occurred).
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { readInputBytes } from '../shared/InputFiles';
import { FileInfo, statPath } from '../shared/FileInfo';
import { strerror } from '../shared/PathOps';
import { DirectoryNode } from '../../entities/filesystem/DirectoryNode';
import { gzipEncode, gzipDecode, isGzip, GzipError } from '../../utils/Gzip';
import { isCompressed, lzwDecompress } from '../../utils/Lzw';
import { concatBytes } from '../../utils/ArchiveEntry';
import { isTty } from '../../services/shell/io/IOContext';
import { bytesToBinaryString, decodeStream } from '../../services/shell/io/OutputSink';
import { basename } from './BasenameCommand';

type Flavor = 'gzip' | 'gunzip' | 'zcat';

interface GzipOptions {
    decompress: boolean;
    stdout: boolean;
    force: boolean;
    keep: boolean;
    list: boolean;
    test: boolean;
    noName: boolean;
    name: boolean;
    quiet: boolean;
    recursive: boolean;
    verbose: boolean;
    level: number;
    suffix: string;
}

/** Suffixes gunzip strips, in the order GNU gzip tries them. */
const KNOWN_SUFFIXES = ['.gz', '-gz', '.z', '-z', '_z', '.Z', '.tgz', '.taz'];

const LONG: Record<string, string> = {
    stdout: 'c', 'to-stdout': 'c', decompress: 'd', uncompress: 'd', force: 'f', keep: 'k', list: 'l', 'no-name': 'n',
    name: 'N', quiet: 'q', silent: 'q', recursive: 'r', test: 't', verbose: 'v', fast: '1', best: '9', suffix: 'S',
};

/** gzip's ratio display: "%5.1f%%". */
function ratio(num: number, den: number): string {
    return `${(den === 0 ? 0 : (100 * num) / den).toFixed(1).padStart(5)}%`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface ListRow { compressed: number; uncompressed: number; overhead: number; crc: number; mtime: number; name: string; }

class Run {
    errors = false;
    warnings = false;
    stderr: string[] = [];
    out: Uint8Array[] = [];
    binaryOut = false;
    listRows: ListRow[] = [];
    listText = '';

    constructor(readonly context: ProcessContext, readonly state: TerminalState, readonly o: GzipOptions) { }

    error(msg: string, blank = false) { this.stderr.push(`${blank ? '\n' : ''}gzip: ${msg}`); this.errors = true; }
    warn(msg: string, blank = false) { if (!this.o.quiet) this.stderr.push(`${blank ? '\n' : ''}gzip: ${msg}`); this.warnings = true; }
    note(msg: string) { this.stderr.push(msg); }
}

export class GzipCommand extends Utility {
    readonly utility = 'gzip';
    readonly capabilities = [CommandCapability.MODIFY];

    constructor(private readonly flavor: Flavor = 'gzip') { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const parsed = this.parse(args);
        if ('error' in parsed) {
            return { output: '', stderr: `gzip: ${parsed.error}\nTry \`gzip --help' for more information.\n`, exitCode: 1, newState: state };
        }
        const { o, operands } = parsed;
        const run = new Run(context, state, o);
        const files = operands.length ? operands : ['-'];

        if (files.includes('-') && !o.force) {
            if (!o.decompress && !o.list && !o.test && context.stdoutIsTty === true) {
                return this.usageFail(state, 'compressed data not written to a terminal. Use -f to force compression.');
            }
            if ((o.decompress || o.list || o.test) && isTty(context.stdin)) {
                return this.usageFail(state, 'compressed data not read from a terminal. Use -f to force decompression.');
            }
        }

        for (const file of files) this.process(run, file);
        if (o.list) this.printList(run);

        const bytes = concatBytes(run.out);
        let output = '';
        let binary = false;
        if (bytes.length) {
            if (run.binaryOut) { output = bytesToBinaryString(bytes); binary = true; }
            else ({ text: output, binary } = decodeStream(bytes));
        }
        if (o.list) output = run.listText;
        const status = run.errors ? 1 : run.warnings ? 2 : 0;
        return { output, binary: binary || undefined, stderr: run.stderr.length ? run.stderr.join('\n') + '\n' : undefined, exitCode: status, newState: state };
    }

    private usageFail(state: TerminalState, msg: string): CommandResponse {
        return { output: '', stderr: `gzip: ${msg}\nFor help, type: gzip -h\n`, exitCode: 1, newState: state };
    }

    private parse(args: string[]): { o: GzipOptions; operands: string[] } | { error: string } {
        const o: GzipOptions = {
            decompress: this.flavor !== 'gzip', stdout: this.flavor === 'zcat', force: false, keep: false, list: false, test: false,
            noName: false, name: false, quiet: false, recursive: false, verbose: false, level: 6, suffix: '.gz',
        };
        const operands: string[] = [];
        const set = (c: string, value?: string): string | null => {
            switch (c) {
                case 'c': o.stdout = true; break;
                case 'd': o.decompress = true; break;
                case 'f': o.force = true; break;
                case 'k': o.keep = true; break;
                case 'l': o.list = true; o.decompress = true; break;
                case 'n': o.noName = true; o.name = false; break;
                case 'N': o.name = true; o.noName = false; break;
                case 'q': o.quiet = true; o.verbose = false; break;
                case 'r': o.recursive = true; break;
                case 't': o.test = true; o.decompress = true; break;
                case 'v': o.verbose = true; o.quiet = false; break;
                case 'S':
                    if (!value) return 'invalid suffix \'\'';
                    o.suffix = value; break;
                default:
                    if (/^[1-9]$/.test(c)) { o.level = Number(c); break; }
                    return `invalid option -- '${c}'`;
            }
            return null;
        };
        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            if (a === '--') { operands.push(...args.slice(i + 1)); break; }
            if (!a.startsWith('-') || a === '-') { operands.push(a); continue; }
            if (a.startsWith('--')) {
                const eq = a.indexOf('=');
                const key = a.slice(2, eq < 0 ? undefined : eq);
                const matches = Object.keys(LONG).filter(k => k.startsWith(key));
                const name = LONG[key] ? key : matches.length === 1 ? matches[0] : null;
                if (!name) return { error: `unrecognized option '${a}'` };
                const c = LONG[name];
                const value = c === 'S' ? (eq >= 0 ? a.slice(eq + 1) : args[++i]) : undefined;
                const err = set(c, value);
                if (err) return { error: err };
                continue;
            }
            for (let j = 1; j < a.length; j++) {
                if (a[j] === 'S') {
                    const value = j + 1 < a.length ? a.slice(j + 1) : args[++i];
                    if (value === undefined) return { error: "option requires an argument -- 'S'" };
                    const err = set('S', value);
                    if (err) return { error: err };
                    break;
                }
                const err = set(a[j]);
                if (err) return { error: err };
            }
        }
        if (o.test || o.list) o.stdout = false;
        return { o, operands };
    }

    // ------------------------------------------------------------ per operand

    private process(run: Run, file: string): void {
        if (file === '-') { this.processStdin(run); return; }
        const { context, o } = run;
        let path = file;
        let info = statPath(context, path, false);
        if (!info && o.decompress) {
            for (const suf of [o.suffix, ...KNOWN_SUFFIXES]) {
                const candidate = statPath(context, file + suf, false);
                if (candidate) { path = file + suf; info = candidate; break; }
            }
        }
        if (!info) { run.error(`${o.decompress && !this.suffixOf(file) ? file + o.suffix : file}: No such file or directory`); return; }
        if (info.kind === 'directory') {
            if (!o.recursive) { run.warn(`${path} is a directory -- ignored`); return; }
            this.recurse(run, path, info);
            return;
        }
        if (info.kind === 'symlink' && !o.force && !o.stdout) { run.error(`${path}: Too many levels of symbolic links`); return; }
        const target = info.kind === 'symlink' ? statPath(context, path, true) : info;
        if (!target || target.kind !== 'regular') {
            if (!target) { run.error(`${path}: No such file or directory`); return; }
            run.warn(`${path} is not a directory or a regular file - ignored`);
            return;
        }
        if (o.decompress) this.decompressFile(run, path, target);
        else this.compressFile(run, path, target);
    }

    private recurse(run: Run, path: string, info: FileInfo): void {
        const node = run.context.fileSystemService.resolve(info.path, '/');
        if (!(node instanceof DirectoryNode)) return;
        const names = Array.from(node.children.keys()).sort();
        for (const name of names) {
            const child = path.endsWith('/') ? path + name : `${path}/${name}`;
            if (!run.o.decompress && !run.o.stdout && this.suffixOf(child, true)) continue;
            if (run.o.decompress && !run.o.stdout && !run.o.test && !run.o.list && !this.suffixOf(child) && statPath(run.context, child, false)?.kind !== 'directory') continue;
            this.process(run, child);
        }
    }

    /** The known compression suffix `name` ends with, if any. */
    private suffixOf(name: string, compressOnly = false): string | null {
        const base = basename(name);
        const list = compressOnly ? [this.currentSuffix] : [this.currentSuffix, ...KNOWN_SUFFIXES];
        for (const s of list) if (base.length > s.length && base.endsWith(s)) return s;
        return null;
    }

    private currentSuffix = '.gz';

    private read(run: Run, path: string): Uint8Array | null {
        const input = readInputBytes(run.context, path);
        if (!input.ok) { run.error(input.error); return null; }
        return input.data;
    }

    private compressFile(run: Run, path: string, info: FileInfo): void {
        const { o } = run;
        this.currentSuffix = o.suffix;
        if (!o.stdout && this.suffixOf(path, true)) {
            if (!o.quiet) run.note(`gzip: ${path} already has ${o.suffix} suffix -- unchanged`);
            return;
        }
        const data = this.read(run, path);
        if (!data) return;
        const name = basename(path);
        const gz = gzipEncode(data, { level: o.level, name: o.noName ? undefined : name, mtime: o.noName ? 0 : Math.floor(info.inode.mtime / 1000) });
        const overhead = 18 + (o.noName ? 0 : name.length + 1);
        const r = ratio(data.length - (gz.length - overhead), data.length);
        if (o.stdout) {
            run.out.push(gz);
            run.binaryOut = true;
            if (o.verbose) run.note(`${path}:\t${r} -- replaced with stdout`);
            return;
        }
        const out = path + o.suffix;
        if (!this.writeSibling(run, path, out, gz, info, info.inode.mtime)) return;
        if (o.verbose) run.note(`${path}:\t${r} -- ${o.keep ? 'created' : 'replaced with'} ${out}`);
    }

    private decompressFile(run: Run, path: string, info: FileInfo): void {
        const { o } = run;
        this.currentSuffix = o.suffix;
        let out = '';
        if (!o.stdout && !o.test && !o.list) {
            const suf = this.suffixOf(path);
            if (!suf) { run.warn(`${path}: unknown suffix -- ignored`); return; }
            out = path.slice(0, -suf.length) + (suf === '.tgz' || suf === '.taz' ? '.tar' : '');
        }
        const data = this.read(run, path);
        if (!data) return;
        const res = this.expand(run, path, data);
        if (!res) return;
        if (o.list) { run.listRows.push({ ...res.list, name: this.listName(path), mtime: res.list.mtime || Math.floor(info.inode.mtime / 1000) }); return; }
        if (o.test) { if (o.verbose) run.note(`${path}:\t OK`); return; }
        const r = ratio(res.data.length - (data.length - res.list.overhead), res.data.length);
        if (o.stdout) {
            run.out.push(res.data);
            if (o.verbose) run.note(`${path}:\t${r}`);
            return;
        }
        let mtime = info.inode.mtime;
        if (o.name) {
            if (res.storedName) out = (path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '') + basename(res.storedName);
            if (res.list.mtime) mtime = res.list.mtime * 1000;
        }
        if (!this.writeSibling(run, path, out, res.data, info, mtime)) return;
        if (o.verbose) run.note(`${path}:\t${r} -- ${o.keep ? 'created' : 'replaced with'} ${out}`);
    }

    private listName(path: string): string {
        const suf = this.suffixOf(path);
        return suf ? path.slice(0, -suf.length) + (suf === '.tgz' || suf === '.taz' ? '.tar' : '') : path;
    }

    private processStdin(run: Run): void {
        const { o } = run;
        const data = this.read(run, '-');
        if (!data) return;
        if (!o.decompress) {
            const gz = gzipEncode(data, { level: o.level });
            run.out.push(gz);
            run.binaryOut = true;
            if (o.verbose) run.note(ratio(data.length - (gz.length - 18), data.length));
            return;
        }
        const res = this.expand(run, 'stdin', data);
        if (!res) return;
        if (o.list) { run.listRows.push({ ...res.list, name: 'stdout' }); return; }
        if (o.test) { if (o.verbose) run.note('stdin:\t OK'); return; }
        run.out.push(res.data);
        if (o.verbose) run.note(ratio(res.data.length - (data.length - res.list.overhead), res.data.length));
    }

    /** Decodes gzip or .Z data (or passes it through for zcat -f / gzip -dcf). */
    private expand(run: Run, name: string, data: Uint8Array): { data: Uint8Array; storedName?: string; list: Omit<ListRow, 'name'> } | null {
        const { o } = run;
        if (isGzip(data)) {
            try {
                const res = gzipDecode(data);
                if (res.trailingGarbage) run.warn(`${name}: decompression OK, trailing garbage ignored`, true);
                const first = res.members[0];
                return {
                    data: res.data, storedName: first?.name,
                    list: {
                        compressed: data.length, uncompressed: res.data.length, crc: res.members[res.members.length - 1]?.crc ?? 0,
                        overhead: res.members.reduce((n, m) => n + m.overhead, 0), mtime: first?.mtime ?? 0,
                    },
                };
            } catch (e) {
                run.error(`${name}: ${e instanceof GzipError ? e.message : strerror(e)}`, true);
                return null;
            }
        }
        if (isCompressed(data)) {
            try {
                const out = lzwDecompress(data);
                return { data: out, list: { compressed: data.length, uncompressed: out.length, crc: 0, overhead: 0, mtime: 0 } };
            } catch (e: any) {
                run.error(`${name}: ${e?.message ?? 'corrupt input'}`, true);
                return null;
            }
        }
        if (o.force && o.stdout && !o.test && !o.list) {
            return { data, list: { compressed: data.length, uncompressed: data.length, crc: 0, overhead: 0, mtime: 0 } };
        }
        run.error(`${name}: not in gzip format`, true);
        return null;
    }

    /** Writes `out` next to `src`, copying its mode, owner and the given mtime; removes `src` unless -k. */
    private writeSibling(run: Run, src: string, out: string, data: Uint8Array, info: FileInfo, mtime: number): boolean {
        const { context, state, o } = run;
        const fs = context.fileSystemService.asUser(context.user, state.umask ?? 0o022);
        const existing = statPath(context, out, false);
        if (existing) {
            if (!o.force) { run.warn(`${out} already exists;\tnot overwritten`); return false; }
            try { fs.deleteNode(fs.resolveAbsolutePath(out, context.cwd), '/'); }
            catch (e) { run.error(`${out}: ${strerror(e)}`); return false; }
        }
        const abs = fs.resolveAbsolutePath(out, context.cwd);
        try {
            fs.writeFile(abs, data, 'w', undefined, undefined, '/');
        } catch (e) {
            run.error(`${out}: ${strerror(e)}`);
            return false;
        }
        try { context.fileSystemService.chown(abs, info.inode.uid, info.inode.gid, '/', context.user); } catch { /* only root can give files away */ }
        try { fs.chmod(abs, info.inode.mode & 0o7777, '/'); } catch { /* keep the default mode */ }
        const created = statPath(context, abs, false);
        if (created) created.inode.mtime = mtime;
        if (!o.keep) {
            try { fs.deleteNode(fs.resolveAbsolutePath(src, context.cwd), '/'); }
            catch (e) { run.error(`${src}: ${strerror(e)}`); }
        }
        return true;
    }

    // ------------------------------------------------------------ -l

    private printList(run: Run): void {
        const v = run.o.verbose;
        const lines: string[] = [];
        if (run.listRows.length) {
            lines.push(`${v ? 'method  crc     date  time  ' : ''}${'compressed'.padStart(19)} ${'uncompressed'.padStart(19)}  ratio uncompressed_name`);
        }
        let totalIn = 0, totalOut = 0, lastOverhead = 0;
        for (const row of run.listRows) {
            let line = '';
            if (v) {
                const d = new Date(row.mtime * 1000);
                line += `defla ${row.crc.toString(16).padStart(8, '0')} ${MONTHS[d.getMonth()]}${String(d.getDate()).padStart(3)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} `;
            }
            line += `${String(row.compressed).padStart(19)} ${String(row.uncompressed).padStart(19)} ${ratio(row.uncompressed - (row.compressed - row.overhead), row.uncompressed)} ${row.name}`;
            lines.push(line);
            totalIn += row.compressed;
            totalOut += row.uncompressed;
            lastOverhead = row.overhead;
        }
        if (run.listRows.length > 1) {
            // GNU gzip subtracts only the last file's header bytes from the totals.
            lines.push(`${v ? ' '.repeat(28) : ''}${String(totalIn).padStart(19)} ${String(totalOut).padStart(19)} ${ratio(totalOut - (totalIn - lastOverhead), totalOut)} (totals)`);
        }
        run.listText = lines.length ? lines.join('\n') + '\n' : '';
    }
}
