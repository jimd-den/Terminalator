/**
 * cpio - copy files to and from archives (GNU cpio compatible):
 *
 *   cpio -o [-AcvL] [-H format] [-F|-O archive] [-R owner]  < name-list > archive
 *   cpio -i [-cdfmtuv] [-H format] [-F|-I archive] [pattern...] < archive
 *   cpio -p [-dlLmuv] [-R owner] directory                   < name-list
 *
 * Formats: bin (default for -o), odc (-c), newc, crc, ustar/tar; input
 * formats are detected automatically. "N blocks" (512 bytes) is reported on
 * stderr. Existing files are only replaced by older-or-equal members with -u.
 * Exit status: 0 success, 2 when some file could not be processed.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext, getStdinAsString } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { readInputBytes } from '../shared/InputFiles';
import { statPath } from '../shared/FileInfo';
import { strerror } from '../shared/PathOps';
import { ArchiveCollector, ArchiveExtractor, NameCache, writeArchive, matchesPattern } from '../shared/ArchiveFs';
import { cpioLine } from '../shared/ArchiveListing';
import { ArchiveEntry, concatBytes } from '../../utils/ArchiveEntry';
import { CpioFormat, encodeCpio, decodeCpio, resolveLinks } from '../../utils/Cpio';
import { encodeEntry, decodeArchive, isTarHeader, BLOCK } from '../../utils/Ustar';
import { bytesToBinaryString } from '../../services/shell/io/OutputSink';

type Format = CpioFormat | 'ustar';
const FORMATS: Record<string, Format> = { bin: 'bin', odc: 'odc', newc: 'newc', crc: 'crc', ustar: 'ustar', tar: 'ustar' };

interface CpioOptions {
    mode?: 'o' | 'i' | 'p';
    list: boolean;
    verbose: boolean;
    makeDirs: boolean;
    keepMtime: boolean;
    unconditional: boolean;
    nonmatching: boolean;
    append: boolean;
    follow: boolean;
    link: boolean;
    format?: Format;
    file?: string;
    owner?: string;
    nullTerminated: boolean;
}

function blocks(bytes: number): string {
    const n = Math.ceil(bytes / 512);
    return `${n} block${n === 1 ? '' : 's'}`;
}

export class CpioCommand extends Utility {
    readonly utility = 'cpio';
    readonly capabilities = [CommandCapability.MODIFY];

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const parsed = this.parse(args);
        if ('error' in parsed) {
            return { output: '', stderr: `cpio: ${parsed.error}\nTry 'cpio --help' or 'cpio --usage' for more information.\n`, exitCode: 2, newState: state };
        }
        const { o, operands } = parsed;
        if (!o.mode) {
            return { output: '', stderr: 'cpio: You must specify one of -oipt options.\nTry \'cpio --help\' or \'cpio --usage\' for more information.\n', exitCode: 2, newState: state };
        }
        const run = { stderr: [] as string[], failed: false };
        const err = (msg: string) => { run.stderr.push(`cpio: ${msg}`); run.failed = true; };
        let output = '';
        let binary = false;

        if (o.mode === 'o') {
            const res = this.copyOut(o, context, state, err, run.stderr);
            if (res.fatal) return this.finish(state, '', run.stderr, 2);
            if (res.stdout) { output = bytesToBinaryString(res.stdout); binary = true; }
        } else if (o.mode === 'i') {
            const res = this.copyIn(o, operands, context, state, err, run.stderr);
            output = res;
        } else {
            if (operands.length !== 1) return this.finish(state, '', ['cpio: You must specify exactly one directory with -p'], 2);
            this.pass(o, operands[0], context, state, err, run.stderr);
        }
        return this.finish(state, output, run.stderr, run.failed ? 2 : 0, binary);
    }

    private finish(state: TerminalState, output: string, stderr: string[], status: number, binary = false): CommandResponse {
        return { output, binary: binary || undefined, stderr: stderr.length ? stderr.join('\n') + '\n' : undefined, exitCode: status, newState: state };
    }

    private parse(args: string[]): { o: CpioOptions; operands: string[] } | { error: string } {
        const o: CpioOptions = {
            list: false, verbose: false, makeDirs: false, keepMtime: false, unconditional: false, nonmatching: false,
            append: false, follow: false, link: false, nullTerminated: false,
        };
        const operands: string[] = [];
        const withArg = 'HFOIRE';
        const long: Record<string, string> = {
            create: 'o', extract: 'i', 'pass-through': 'p', list: 't', verbose: 'v', 'make-directories': 'd',
            'preserve-modification-time': 'm', unconditional: 'u', nonmatching: 'f', append: 'A', dereference: 'L', link: 'l',
            format: 'H', file: 'F', owner: 'R', null: '0',
        };
        const set = (c: string, v?: string): string | null => {
            switch (c) {
                case 'o': case 'i': case 'p':
                    if (o.mode && o.mode !== c) return 'Mode already defined';
                    o.mode = c; break;
                case 't': o.list = true; o.mode ??= 'i'; break;
                case 'v': o.verbose = true; break;
                case 'd': o.makeDirs = true; break;
                case 'm': o.keepMtime = true; break;
                case 'u': o.unconditional = true; break;
                case 'f': o.nonmatching = true; break;
                case 'A': o.append = true; break;
                case 'L': o.follow = true; break;
                case 'l': o.link = true; break;
                case 'c': o.format = 'odc'; break;
                case '0': o.nullTerminated = true; break;
                case 'H':
                    if (!FORMATS[v!.toLowerCase()]) return `invalid archive format \`${v}'; valid formats are:\ncrc newc odc bin ustar tar (all-caps also recognized)`;
                    o.format = FORMATS[v!.toLowerCase()]; break;
                case 'F': case 'O': case 'I': o.file = v; break;
                case 'R': o.owner = v; break;
                case 'B': case 'a': case 'n': case 'V': break;
                default: return `invalid option -- '${c}'`;
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
                const c = long[key];
                if (!c) return { error: `unrecognized option '${a}'` };
                const v = withArg.includes(c) ? (eq >= 0 ? a.slice(eq + 1) : args[++i]) : undefined;
                if (withArg.includes(c) && v === undefined) return { error: `option '--${key}' requires an argument` };
                const e = set(c, v);
                if (e) return { error: e };
                continue;
            }
            for (let j = 1; j < a.length; j++) {
                const c = a[j];
                if (withArg.includes(c)) {
                    const v = j + 1 < a.length ? a.slice(j + 1) : args[++i];
                    if (v === undefined) return { error: `option requires an argument -- '${c}'` };
                    const e = set(c, v);
                    if (e) return { error: e };
                    break;
                }
                const e = set(c);
                if (e) return { error: e };
            }
        }
        return { o, operands };
    }

    /** File names from standard input, one per line (or NUL-separated with -0). */
    private names(o: CpioOptions, context: ProcessContext): string[] {
        const text = getStdinAsString(context) ?? '';
        return text.split(o.nullTerminated ? '\0' : '\n').filter(n => n.length > 0);
    }

    private applyOwner(o: CpioOptions, e: ArchiveEntry, names: NameCache): ArchiveEntry {
        if (!o.owner) return e;
        const [user, group] = o.owner.split(/[:.]/);
        const out = { ...e };
        if (user) out.uid = /^\d+$/.test(user) ? Number(user) : names.uidOf(user, e.uid);
        if (group !== undefined) out.gid = group === '' ? (names.gidOf(names.userName(out.uid), out.gid)) : /^\d+$/.test(group) ? Number(group) : names.gidOf(group, e.gid);
        return out;
    }

    /** Collects each named file (not recursively: the list names every member). */
    private gather(o: CpioOptions, context: ProcessContext, err: (m: string) => void, verbose: string[], skipIno: number | null): ArchiveEntry[] {
        const collector = new ArchiveCollector(context, {
            follow: o.follow, recurse: false, hardlinks: false,
            skip: (_abs, info) => (skipIno !== null && info.inode.id === skipIno ? 'archive file not dumped' : null),
        });
        const names = new NameCache(context.fileSystemService);
        const out: ArchiveEntry[] = [];
        for (const name of this.names(o, context)) {
            collector.collect(name, context.cwd, (e) => {
                out.push(this.applyOwner(o, e, names));
                if (o.verbose) verbose.push(name);
            }, (e) => err(`${e.path}: ${e.op === 'stat' ? 'Cannot stat' : 'Cannot open'}: ${e.reason}`));
        }
        return out;
    }

    private encode(entries: ArchiveEntry[], format: Format): Uint8Array {
        if (format !== 'ustar') return encodeCpio(entries, format);
        const body = concatBytes(entries.map(e => encodeEntry(this.asTarEntry(e, entries))));
        return concatBytes([body, new Uint8Array(2 * BLOCK)]);
    }

    /** cpio's own hard links (shared inodes) become ustar link members after the first. */
    private asTarEntry(e: ArchiveEntry, all: ArchiveEntry[]): ArchiveEntry {
        if (e.kind !== 'file' || (e.nlink ?? 1) < 2) return e;
        const first = all.find(x => x.kind === 'file' && x.ino === e.ino && x.dev === e.dev);
        return first && first !== e ? { ...e, kind: 'hardlink', linkname: first.name, data: new Uint8Array(0) } : e;
    }

    private copyOut(o: CpioOptions, context: ProcessContext, state: TerminalState, err: (m: string) => void, stderr: string[]): { stdout?: Uint8Array; fatal?: boolean } {
        let format: Format = o.format ?? 'bin';
        let previous: ArchiveEntry[] = [];
        let skipIno: number | null = null;
        if (o.file) skipIno = statPath(context, o.file)?.inode.id ?? null;
        if (o.append) {
            if (!o.file) { stderr.push('cpio: --append is used but no archive file name is given (use -F or -O options)'); return { fatal: true }; }
            const input = readInputBytes(context, o.file);
            if (!input.ok) { stderr.push(`cpio: ${input.error}`); return { fatal: true }; }
            const old = this.decode(input.data);
            if (old.error && !old.entries.length) { stderr.push(`cpio: ${old.error}`); return { fatal: true }; }
            previous = old.entries;
            format = old.format ?? format;
        }
        const verbose: string[] = [];
        const entries = [...previous, ...this.gather(o, context, err, verbose, skipIno)];
        stderr.push(...verbose);
        const bytes = this.encode(entries, format);
        const padded = format === 'ustar' ? concatBytes([bytes, new Uint8Array((512 - (bytes.length % 512)) % 512)]) : bytes;
        stderr.push(blocks(padded.length));
        if (!o.file) return { stdout: padded };
        const e = writeArchive(context, state.umask ?? 0o022, o.file, padded);
        if (e) { stderr.push(`cpio: ${o.file}: Cannot open: ${e}`); return { fatal: true }; }
        return {};
    }

    private decode(data: Uint8Array): { entries: ArchiveEntry[]; format: Format | null; error?: string; size: number } {
        if (isTarHeader(data, 0)) {
            const r = decodeArchive(data);
            return { entries: r.entries, format: 'ustar', error: r.error, size: r.end + 2 * BLOCK };
        }
        const r = decodeCpio(data);
        return { entries: r.entries, format: r.format, error: r.error, size: r.end };
    }

    private copyIn(o: CpioOptions, patterns: string[], context: ProcessContext, state: TerminalState, err: (m: string) => void, stderr: string[]): string {
        const input = readInputBytes(context, o.file ?? '-');
        if (!input.ok) { err(input.error); return ''; }
        const archive = this.decode(input.data);
        const selected = (name: string) => {
            if (!patterns.length) return true;
            const hit = patterns.some(p => matchesPattern(p, name));
            return o.nonmatching ? !hit : hit;
        };
        const names = new NameCache(context.fileSystemService);
        const out: string[] = [];
        if (o.list) {
            for (const e of archive.entries) if (selected(e.name)) out.push(o.verbose ? cpioLine(e, names) : e.name);
        } else {
            const extractor = new ArchiveExtractor(context, {
                baseDir: context.cwd, umask: state.umask ?? 0o022, preservePerms: true, preserveOwner: true,
                restoreMtime: o.keepMtime, existing: o.unconditional ? 'replace' : 'newer', makeParents: o.makeDirs,
            });
            for (const e of resolveLinks(archive.entries)) {
                if (!selected(e.name)) continue;
                const name = e.name.replace(/^\/+/, '') || '.';
                if (e.kind === 'dir' && statPath(context, name)?.kind === 'directory') { if (o.verbose) stderr.push(e.name); continue; }
                const res = extractor.extract(e, name);
                if (!res.ok) {
                    if (res.op === 'newer') stderr.push(`cpio: ${e.name} not created: newer or same age version exists`);
                    else if (res.reason === 'No such file or directory' && res.op !== 'link') err(`${e.name}: Cannot open: No such file or directory`);
                    else err(`${e.name}: ${res.op === 'link' ? `Cannot link to ${e.linkname}` : res.op === 'mkdir' ? 'Cannot mkdir' : res.op === 'mknod' ? 'Cannot mknod' : 'Cannot open'}: ${res.reason}`);
                    continue;
                }
                if (o.verbose) stderr.push(e.name);
            }
            extractor.finish();
        }
        if (archive.error) { err(archive.error); return out.length ? out.join('\n') + '\n' : ''; }
        stderr.push(blocks(archive.size));
        return out.length ? out.join('\n') + '\n' : '';
    }

    private pass(o: CpioOptions, dest: string, context: ProcessContext, state: TerminalState, err: (m: string) => void, stderr: string[]): void {
        let destInfo = statPath(context, dest);
        if (!destInfo && o.makeDirs) {
            try { context.fileSystemService.asUser(context.user, state.umask ?? 0o022).mkdirp(dest, undefined, undefined, undefined, context.cwd); } catch (x) { err(`${dest}: Cannot mkdir: ${strerror(x)}`); }
            destInfo = statPath(context, dest);
        }
        const names = new NameCache(context.fileSystemService);
        const fs = context.fileSystemService;
        const destAbs = fs.resolveAbsolutePath(dest, context.cwd);
        const extractor = new ArchiveExtractor(context, {
            baseDir: destAbs, umask: state.umask ?? 0o022, preservePerms: true, preserveOwner: true,
            restoreMtime: o.keepMtime, existing: o.unconditional ? 'replace' : 'newer', makeParents: o.makeDirs,
        });
        const collector = new ArchiveCollector(context, { follow: o.follow, recurse: false, hardlinks: false });
        let bytes = 0;
        for (const name of this.names(o, context)) {
            collector.collect(name, context.cwd, (entry, abs) => {
                const e = this.applyOwner(o, entry, names);
                const rel = name.replace(/^\/+/, '');
                const target = `${dest.replace(/\/+$/, '')}/${rel}`;
                if (!destInfo || destInfo.kind !== 'directory') { err(`${target}: Cannot open: No such file or directory`); return; }
                if (e.kind === 'dir' && statPath(context, target)?.kind === 'directory') return;
                if (o.link && e.kind === 'file') {
                    const existing = statPath(context, target, false);
                    try {
                        if (existing && o.unconditional) fs.deleteNode(fs.resolveAbsolutePath(target, context.cwd), '/', context.user);
                        fs.asUser(context.user).link(abs, fs.resolveAbsolutePath(target, context.cwd), '/');
                        if (o.verbose) stderr.push(target);
                    } catch (x) { err(`cannot link ${name} to ${target}: ${strerror(x)}`); }
                    return;
                }
                const res = extractor.extract(e, rel);
                if (!res.ok) {
                    if (res.op === 'newer') stderr.push(`cpio: ${target} not created: newer or same age version exists`);
                    else err(`${target}: Cannot open: ${res.reason}`);
                    return;
                }
                bytes += e.data.length;
                if (o.verbose) stderr.push(target);
            }, (e) => err(`${e.path}: Cannot stat: ${e.reason}`));
        }
        extractor.finish();
        stderr.push(blocks(bytes));
    }
}
