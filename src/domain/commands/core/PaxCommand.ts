/**
 * pax - portable archive interchange (POSIX):
 *
 *   pax [-cdnv] [-H|-L] [-f archive] [-s replstr]... [pattern...]
 *   pax -r [-cdiknuv] [-H|-L] [-f archive] [-o options] [-p string]... [-s replstr]... [pattern...]
 *   pax -w [-dituvX] [-H|-L] [-b blocksize] [[-a] -f archive] [-o options] [-s replstr]... [-x format] [file...]
 *   pax -r -w [-diklntuvX] [-H|-L] [-p string]... [-s replstr]... [file...] directory
 *
 * Formats: ustar (default) and cpio (odc), plus the sv4cpio/sv4crc/bcpio
 * cpio variants; they share the codecs and file system adapters of tar and
 * cpio. Patterns use fnmatch() notation; -s substitutes member names with
 * BREs (/old/new/[gp]); -p takes a (atime), e (everything), m (no mtime),
 * o (owner) and p (mode). Exit status: 0 success, 1 an error occurred.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext, getStdinAsString } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { readInputBytes } from '../shared/InputFiles';
import { statPath } from '../shared/FileInfo';
import { autoDecompress } from '../shared/Compression';
import { ArchiveCollector, ArchiveExtractor, NameCache, writeArchive, matchesPattern } from '../shared/ArchiveFs';
import { paxLine } from '../shared/ArchiveListing';
import { ArchiveEntry, concatBytes } from '../../utils/ArchiveEntry';
import { encodeEntry, decodeArchive, isTarHeader, trailer, UstarError } from '../../utils/Ustar';
import { CpioFormat, encodeCpio, decodeCpio, resolveLinks } from '../../utils/Cpio';
import { compilePosixRegex } from '../../utils/PosixRegex';
import { bytesToBinaryString } from '../../services/shell/io/OutputSink';

type Format = 'ustar' | CpioFormat;
const FORMATS: Record<string, Format> = { ustar: 'ustar', tar: 'ustar', cpio: 'odc', sv4cpio: 'newc', sv4crc: 'crc', bcpio: 'bin' };
const FORMAT_NAMES: Record<Format, string> = { ustar: 'ustar', odc: 'cpio', newc: 'sv4cpio', crc: 'sv4crc', bin: 'bcpio' };

interface Subst { re: RegExp; replacement: string; print: boolean; }

interface PaxOptions {
    read: boolean;
    write: boolean;
    append: boolean;
    complement: boolean;
    noDescend: boolean;
    keep: boolean;
    link: boolean;
    firstOnly: boolean;
    update: boolean;
    verbose: boolean;
    followArgs: boolean;
    follow: boolean;
    archive?: string;
    format: Format;
    formatGiven: boolean;
    subst: Subst[];
    preserve: { mtime: boolean; owner: boolean; mode: boolean };
}

class Usage extends Error { }

export class PaxCommand extends Utility {
    readonly utility = 'pax';
    readonly capabilities = [CommandCapability.MODIFY];

    private stderr: string[] = [];
    private failed = false;

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        this.stderr = [];
        this.failed = false;
        let o: PaxOptions, operands: string[];
        try {
            ({ o, operands } = this.parse(args));
        } catch (e: any) {
            if (!(e instanceof Usage)) throw e;
            return this.finish(state, '', [`pax: ${e.message}`, 'usage: pax [-cdnv] [-f archive] [-s replstr] [pattern ...]'], 1);
        }
        let output = '';
        let binary = false;
        if (o.read && o.write) this.copy(o, operands, context, state);
        else if (o.write) {
            const bytes = this.write(o, operands, context, state);
            if (bytes) { output = bytesToBinaryString(bytes); binary = true; }
        } else output = this.readOrList(o, operands, context, state);
        return this.finish(state, output, [], this.failed ? 1 : 0, binary);
    }

    private finish(state: TerminalState, output: string, extra: string[], status: number, binary = false): CommandResponse {
        const lines = [...this.stderr, ...extra];
        return { output, binary: binary || undefined, stderr: lines.length ? lines.join('\n') + '\n' : undefined, exitCode: status, newState: state };
    }

    private error(msg: string): void {
        this.stderr.push(`pax: ${msg}`);
        this.failed = true;
    }

    // ------------------------------------------------------------ options

    private parse(args: string[]): { o: PaxOptions; operands: string[] } {
        const o: PaxOptions = {
            read: false, write: false, append: false, complement: false, noDescend: false, keep: false, link: false,
            firstOnly: false, update: false, verbose: false, followArgs: false, follow: false, format: 'ustar', formatGiven: false,
            subst: [], preserve: { mtime: true, owner: false, mode: false },
        };
        const operands: string[] = [];
        const withArg = 'fsxpobB';
        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            if (a === '--') { operands.push(...args.slice(i + 1)); break; }
            if (!a.startsWith('-') || a === '-') { operands.push(a); continue; }
            for (let j = 1; j < a.length; j++) {
                const c = a[j];
                let v: string | undefined;
                if (withArg.includes(c)) {
                    v = j + 1 < a.length ? a.slice(j + 1) : args[++i];
                    if (v === undefined) throw new Usage(`option requires an argument -- ${c}`);
                    j = a.length;
                }
                switch (c) {
                    case 'r': o.read = true; break;
                    case 'w': o.write = true; break;
                    case 'a': o.append = true; break;
                    case 'c': o.complement = true; break;
                    case 'd': o.noDescend = true; break;
                    case 'k': o.keep = true; break;
                    case 'l': o.link = true; break;
                    case 'n': o.firstOnly = true; break;
                    case 'u': o.update = true; break;
                    case 'v': o.verbose = true; break;
                    case 'H': o.followArgs = true; break;
                    case 'L': o.follow = true; break;
                    case 'i': case 't': case 'X': break;
                    case 'f': o.archive = v; break;
                    case 'b': case 'B': case 'o': break;
                    case 's': o.subst.push(this.parseSubst(v!)); break;
                    case 'x':
                        if (!FORMATS[v!]) throw new Usage(`Unknown -x format: ${v}`);
                        o.format = FORMATS[v!];
                        o.formatGiven = true;
                        break;
                    case 'p':
                        for (const p of v!) {
                            if (p === 'e') { o.preserve = { mtime: true, owner: true, mode: true }; }
                            else if (p === 'm') o.preserve.mtime = false;
                            else if (p === 'o') o.preserve.owner = true;
                            else if (p === 'p') o.preserve.mode = true;
                            else if (p !== 'a') throw new Usage(`Invalid -p string: ${v}`);
                        }
                        break;
                    default: throw new Usage(`invalid option -- ${c}`);
                }
            }
        }
        return { o, operands };
    }

    /** -s /old/new/[gp]: any delimiter, which a backslash may escape. */
    private parseSubst(spec: string): Subst {
        const delim = spec[0];
        const parts: string[] = [''];
        for (let i = 1; i < spec.length; i++) {
            if (spec[i] === '\\' && spec[i + 1] === delim) { parts[parts.length - 1] += delim; i++; continue; }
            if (spec[i] === delim) { parts.push(''); continue; }
            parts[parts.length - 1] += spec[i];
        }
        if (!delim || parts.length !== 3 || /[^gp]/.test(parts[2])) throw new Usage(`Invalid replacement string ${spec}`);
        let re: RegExp;
        try { re = compilePosixRegex(parts[0], { global: parts[2].includes('g') }); }
        catch { throw new Usage(`Invalid RE in replacement string ${spec}`); }
        return { re, replacement: parts[1], print: parts[2].includes('p') };
    }

    /** Applies the first matching -s substitution; null means the member is skipped. */
    private rename(o: PaxOptions, name: string): string | null {
        for (const s of o.subst) {
            s.re.lastIndex = 0;
            if (!s.re.test(name)) continue;
            s.re.lastIndex = 0;
            const out = name.replace(s.re, (...m: any[]) => s.replacement.replace(/\\([0-9])|\\(.)|&/g, (all, d, lit) => {
                if (d !== undefined) return m[Number(d)] ?? '';
                if (lit !== undefined) return lit;
                return m[0];
            }));
            if (s.print) this.stderr.push(`${name} >> ${out}`);
            return out || null;
        }
        return name;
    }

    // ------------------------------------------------------------ pattern selection

    private selector(o: PaxOptions, patterns: string[]) {
        const used = new Set<string>();
        const done = new Set<string>();
        const select = (name: string): boolean => {
            if (!patterns.length) return !o.complement;
            let hit: string | undefined;
            for (const p of patterns) {
                if (o.firstOnly && done.has(p)) continue;
                if (matchesPattern(p, name)) { hit = p; break; }
                // A pattern naming a directory also selects what is below it.
                if (!o.noDescend && name.startsWith(p.replace(/\/+$/, '') + '/') && !/[*?[]/.test(p)) { hit = p; break; }
            }
            if (hit !== undefined && !o.complement) { used.add(hit); if (o.firstOnly) done.add(hit); }
            return o.complement ? hit === undefined : hit !== undefined;
        };
        const report = () => {
            if (o.complement) return;
            const missing = patterns.filter(p => !used.has(p));
            if (missing.length) {
                this.stderr.push('pax: WARNING! These patterns were not matched:', ...missing);
                this.failed = true;
            }
        };
        return { select, report };
    }

    // ------------------------------------------------------------ list / read

    private readArchive(o: PaxOptions, context: ProcessContext): { entries: ArchiveEntry[]; format: Format; size: number } | null {
        const input = readInputBytes(context, o.archive ?? '-');
        if (!input.ok) {
            this.error(`Failed open to read on ${o.archive}: ${input.error.replace(/^.*: /, '')}`);
            return null;
        }
        const expanded = autoDecompress(input.data);
        const data = expanded.ok ? expanded.data : input.data;
        if (isTarHeader(data, 0)) {
            const r = decodeArchive(data);
            if (r.error) this.error(r.error);
            return { entries: r.entries, format: 'ustar', size: input.data.length };
        }
        const r = decodeCpio(data);
        if (!r.format) {
            if (data.length === 0) this.stderr.push('pax: End of archive volume 1 reached');
            this.error('Sorry, unable to determine archive format.');
            return null;
        }
        if (r.error) this.error(r.error);
        return { entries: r.entries, format: r.format, size: input.data.length };
    }

    private summary(format: Format, files: number, read: number, written: number): string {
        return `pax: ${FORMAT_NAMES[format]} vol 1, ${files} files, ${read} bytes read, ${written} bytes written.`;
    }

    private readOrList(o: PaxOptions, patterns: string[], context: ProcessContext, state: TerminalState): string {
        const archive = this.readArchive(o, context);
        if (!archive) return '';
        const { select, report } = this.selector(o, patterns);
        const names = new NameCache(context.fileSystemService);
        const out: string[] = [];
        const extractor = o.read ? this.extractor(o, context, state, context.cwd) : null;
        const entries = o.read && archive.format !== 'ustar' ? resolveLinks(archive.entries) : archive.entries;
        let count = 0;
        for (const entry of entries) {
            if (!select(entry.name)) continue;
            const name = this.rename(o, entry.name);
            if (name === null) continue;
            const e = { ...entry, name, linkname: entry.kind === 'hardlink' ? this.rename(o, entry.linkname) ?? entry.linkname : entry.linkname };
            count++;
            if (!o.read) { out.push(o.verbose ? paxLine(e, names) : e.name); continue; }
            if (o.verbose) this.stderr.push(e.name);
            this.extractOne(o, extractor!, e, context);
        }
        extractor?.finish();
        report();
        if (o.verbose) this.stderr.push(this.summary(archive.format, count, archive.size, 0));
        return out.length ? out.join('\n') + '\n' : '';
    }

    private extractor(o: PaxOptions, context: ProcessContext, state: TerminalState, baseDir: string): ArchiveExtractor {
        return new ArchiveExtractor(context, {
            baseDir, umask: state.umask ?? 0o022, preservePerms: o.preserve.mode, preserveOwner: o.preserve.owner,
            restoreMtime: o.preserve.mtime, existing: o.keep ? 'keep' : o.update ? 'newer' : 'replace', makeParents: true,
        });
    }

    private extractOne(o: PaxOptions, extractor: ArchiveExtractor, e: ArchiveEntry, context: ProcessContext, name = e.name): void {
        if (e.kind === 'dir' && statPath(context, extractor.absolute(name))?.kind === 'directory') {
            extractor.extract(e, name);
            return;
        }
        const res = extractor.extract(e, name);
        if (res.ok || res.op === 'exists' || res.op === 'newer') return;
        if (res.op === 'link') this.error(`Could not link ${e.linkname} to ${name}: ${res.reason}`);
        else if (res.op === 'symlink') this.error(`Could not create symbolic link ${name}: ${res.reason}`);
        else if (res.op === 'mknod') this.error(`Could not create ${name}: ${res.reason}`);
        else this.error(`Unable to create ${name}: ${res.reason}`);
    }

    // ------------------------------------------------------------ write / copy

    private gather(o: PaxOptions, operands: string[], context: ProcessContext, format: Format, skipIno: number | null, visit: (e: ArchiveEntry, abs: string) => void): void {
        const collector = new ArchiveCollector(context, {
            follow: o.follow, followArgs: o.followArgs, recurse: !o.noDescend, hardlinks: format === 'ustar',
            skip: (_abs, info) => (skipIno !== null && info.inode.id === skipIno ? 'skip' : null),
        });
        const files = operands.length ? operands : (getStdinAsString(context) ?? '').split('\n').filter(Boolean);
        const missing: string[] = [];
        for (const file of files) {
            collector.collect(file, context.cwd, (entry, abs) => {
                const name = this.rename(o, entry.name);
                if (name === null) return;
                visit({ ...entry, name }, abs);
            }, (err) => {
                if (err.reason === 'skip') return;
                this.error(`Unable to access ${err.path}: ${err.reason}`);
                if (err.path === file) missing.push(file);
            });
        }
        if (missing.length) this.stderr.push('pax: WARNING! These file names were not selected:', ...missing);
    }

    private write(o: PaxOptions, operands: string[], context: ProcessContext, state: TerminalState): Uint8Array | null {
        let previous = new Uint8Array(0);
        let format = o.format;
        let existing: ArchiveEntry[] = [];
        if (o.append) {
            if (!o.archive || o.archive === '-') { this.error('Cannot append to an archive on standard output'); return null; }
            const input = readInputBytes(context, o.archive);
            if (input.ok && input.data.length) {
                if (isTarHeader(input.data, 0)) {
                    const r = decodeArchive(input.data);
                    previous = input.data.slice(0, r.end);
                    existing = r.entries;
                    format = 'ustar';
                } else {
                    const r = decodeCpio(input.data);
                    if (!r.format) { this.error('Sorry, unable to determine archive format.'); return null; }
                    if (o.formatGiven && r.format !== o.format) { this.error('Cannot mix current archive format with archive format'); return null; }
                    existing = r.entries;
                    format = r.format;
                }
            }
        }
        const skipIno = o.archive && o.archive !== '-' ? statPath(context, o.archive)?.inode.id ?? null : null;
        const entries: ArchiveEntry[] = [];
        const latest = new Map(existing.map(e => [e.name, e.mtime]));
        this.gather(o, operands, context, format, skipIno, (e) => {
            if (o.update && latest.has(e.name) && latest.get(e.name)! >= e.mtime) return;
            if (format === 'ustar') {
                try { encodeEntry(e); } catch (err) {
                    if (err instanceof UstarError) { this.error(`${e.name}: ${err.message}`); return; }
                    throw err;
                }
            }
            entries.push(e);
            if (o.verbose) this.stderr.push(e.name);
        });
        let bytes: Uint8Array;
        if (format === 'ustar') {
            const body = concatBytes([previous, ...entries.map(encodeEntry)]);
            bytes = concatBytes([body, trailer(body.length)]);
        } else {
            bytes = encodeCpio([...existing, ...entries], format);
            bytes = concatBytes([bytes, new Uint8Array((10240 - (bytes.length % 10240)) % 10240)]);
        }
        if (o.verbose) this.stderr.push(this.summary(format, entries.length, 0, bytes.length));
        if (!o.archive || o.archive === '-') return bytes;
        const err = writeArchive(context, state.umask ?? 0o022, o.archive, bytes);
        if (err) this.error(`Failed open to write on ${o.archive}: ${err}`);
        return null;
    }

    private copy(o: PaxOptions, operands: string[], context: ProcessContext, state: TerminalState): void {
        if (operands.length === 0) { this.error('Destination directory was not supplied.'); return; }
        const dest = operands[operands.length - 1];
        const destInfo = statPath(context, dest);
        if (!destInfo || destInfo.kind !== 'directory') {
            this.error(`Cannot access destination directory ${dest}: ${destInfo ? 'Not a directory' : 'No such file or directory'}`);
            return;
        }
        const fs = context.fileSystemService;
        const destAbs = destInfo.path;
        const extractor = this.extractor(o, context, state, destAbs);
        const destName = dest.replace(/\/+$/, '');
        const copied = new Map<number, string>();
        this.gather(o, operands.slice(0, -1), context, 'ustar', null, (e, abs) => {
            const rel = e.name.replace(/^\/+/, '');
            const target = `${destName}/${rel}`;
            const src = statPath(context, abs, false);
            if (src && src.inode.id === destInfo.inode.id) return;
            if (o.verbose) this.stderr.push(target);
            if (o.link && (e.kind === 'file' || e.kind === 'hardlink')) {
                try {
                    const t = fs.resolveAbsolutePath(target, context.cwd);
                    if (statPath(context, t, false)) { if (o.keep) return; fs.asUser(context.user).deleteNode(t, '/'); }
                    fs.asUser(context.user).link(abs, t, '/');
                    return;
                } catch { /* fall back to copying */ }
            }
            const entry = e.kind === 'hardlink' ? { ...e, linkname: copied.get(src?.inode.id ?? -1) ?? e.linkname } : e;
            this.extractOne(o, extractor, entry, context, rel);
            if (src) copied.set(src.inode.id, rel);
        });
        extractor.finish();
    }
}
