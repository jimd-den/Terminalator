/**
 * SccsSupport - file-system side of the SCCS utilities: s-file naming,
 * reading and atomically rewriting s-files, the p-file of pending edits,
 * the invoking user, timestamps and SCCS-style option parsing.
 *
 * Naming: for an s-file `dir/s.name`, the g-file (retrieved text) is
 * `name` in the current directory, the p-file is `dir/p.name`, and the
 * l-file (delta summary) is `l.name` in the current directory.
 */
import { ProcessContext, getStdinAsString } from '../../../entities/ProcessContext';
import { TerminalState } from '../../../entities/TerminalState';
import { FileSystemService } from '../../../services/FileSystemService';
import { DirectoryNode } from '../../../entities/filesystem/DirectoryNode';
import { UserDatabase } from '../../../services/UserDatabase';
import { statPath, canAccess } from '../../shared/FileInfo';
import { strerror } from '../../shared/PathOps';
import { SFile, parseSFile } from './SFile';
import { Sid } from './Sid';

/** Parsed SCCS options: every occurrence's value ('' for a plain flag). */
export interface SccsOptions {
    opts: Map<string, string[]>;
    operands: string[];
    error?: string;
}

/**
 * SCCS keyletter parsing. `spec` lists letters; "x:" takes a value (attached
 * or the next argument), "x::" an optional value that must be attached.
 * As in historical SCCS, options may appear anywhere among the files.
 */
export function sccsOptions(args: string[], spec: string): SccsOptions {
    const opts = new Map<string, string[]>();
    const operands: string[] = [];
    const add = (c: string, v: string) => opts.set(c, [...(opts.get(c) ?? []), v]);
    let onlyOperands = false;
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (onlyOperands || !a.startsWith('-') || a === '-') { operands.push(a); continue; }
        if (a === '--') { onlyOperands = true; continue; }
        for (let j = 1; j < a.length; j++) {
            const c = a[j];
            const idx = spec.indexOf(c);
            if (idx < 0 || c === ':') return { opts, operands, error: `invalid option -- '${c}'` };
            const required = spec[idx + 1] === ':' && spec[idx + 2] !== ':';
            const optional = spec[idx + 1] === ':' && spec[idx + 2] === ':';
            if (required) {
                const v = j + 1 < a.length ? a.slice(j + 1) : args[++i];
                if (v === undefined) return { opts, operands, error: `option requires an argument -- '${c}'` };
                add(c, v);
                break;
            }
            if (optional) { add(c, a.slice(j + 1)); break; }
            add(c, '');
        }
    }
    return { opts, operands };
}

/** Last value given for an option, or undefined. */
export function optValue(o: SccsOptions, c: string): string | undefined {
    const v = o.opts.get(c);
    return v ? v[v.length - 1] : undefined;
}

export interface Stamp { date: string; time: string }

/** yy/mm/dd and hh:mm:ss for a moment (local time). */
export function stamp(when = new Date()): Stamp {
    const two = (n: number) => String(n).padStart(2, '0');
    return {
        date: `${two(when.getFullYear() % 100)}/${two(when.getMonth() + 1)}/${two(when.getDate())}`,
        time: `${two(when.getHours())}:${two(when.getMinutes())}:${two(when.getSeconds())}`,
    };
}

/** Seconds-comparable key for a delta date/time (two-digit years 69-99 are 19xx). */
export function stampKey(date: string, time: string): string {
    const [y, m, d] = date.split('/');
    const year = y.length === 4 ? y : (parseInt(y, 10) >= 69 ? '19' : '20') + y;
    return `${year}${m}${d}${time.replace(/:/g, '')}`;
}

/** A cutoff "YY[MM[DD[HH[MM[SS]]]]]" (non-digits separate fields) as a stampKey upper bound. */
export function cutoffKey(text: string): string | null {
    const digits = text.replace(/[^0-9]/g, '');
    if (digits.length < 2 || digits.length > 12 || digits.length % 2) return null;
    const max = ['', '12', '31', '23', '59', '59'];
    const parts = digits.match(/../g)!;
    for (let k = parts.length; k < 6; k++) parts.push(max[k]);
    const date = `${parts[0]}/${parts[1]}/${parts[2]}`;
    return stampKey(date, `${parts[3]}:${parts[4]}:${parts[5]}`);
}

/** A p-file entry: one pending edit. */
export interface PEntry {
    got: Sid;
    next: Sid;
    user: string;
    date: string;
    time: string;
    include: string;
    exclude: string;
}

export function formatPEntry(p: PEntry): string {
    return `${p.got} ${p.next} ${p.user} ${p.date} ${p.time}${p.include ? ' -i' + p.include : ''}${p.exclude ? ' -x' + p.exclude : ''}`;
}

export function parsePFile(text: string): PEntry[] {
    const out: PEntry[] = [];
    for (const line of text.split('\n')) {
        const f = line.trim().split(/\s+/);
        if (f.length < 5) continue;
        const got = Sid.parse(f[0]), next = Sid.parse(f[1]);
        if (!got || !next) continue;
        const entry: PEntry = { got, next, user: f[2], date: f[3], time: f[4], include: '', exclude: '' };
        for (const extra of f.slice(5)) {
            if (extra.startsWith('-i')) entry.include = extra.slice(2);
            else if (extra.startsWith('-x')) entry.exclude = extra.slice(2);
        }
        out.push(entry);
    }
    return out;
}

/** Expands a delta list "1.2,1.4-1.6" into serial numbers. */
export function serialList(file: SFile, list: string): number[] | null {
    if (!list) return [];
    const out: number[] = [];
    for (const part of list.split(',')) {
        const [lo, hi] = part.split('-').map(s => Sid.parse(s));
        if (!lo) return null;
        const dlo = file.bySid(lo);
        if (!hi) { if (!dlo) return null; out.push(dlo.serial); continue; }
        for (const d of file.deltas) if (d.sid.compare(lo) >= 0 && d.sid.compare(hi) <= 0) out.push(d.serial);
    }
    return out;
}

export type Loaded = { ok: true; file: SFile; path: string } | { ok: false; error: string; status?: number };

/** The process's view of SCCS files. */
export class SccsEnv {
    readonly fs: FileSystemService;
    readonly umask: number;

    constructor(readonly context: ProcessContext, state: TerminalState) {
        this.umask = state.umask ?? 0o022;
        this.fs = context.fileSystemService.asUser(context.user, this.umask);
    }

    /** Login name of the invoking user. */
    get user(): string {
        return new UserDatabase(this.context.fileSystemService).userName(this.context.user.uid);
    }

    /** Group ids of the invoking user (for user-list checks). */
    get groups(): number[] {
        return [this.context.user.gid, ...this.context.user.groups];
    }

    abs(path: string): string {
        return this.fs.resolveAbsolutePath(path, this.context.cwd);
    }

    exists(path: string): boolean {
        return statPath(this.context, path) !== null;
    }

    isDir(path: string): boolean {
        return statPath(this.context, path)?.kind === 'directory';
    }

    writable(path: string): boolean {
        const info = statPath(this.context, path);
        return !!info && canAccess(this.context, info, 2);
    }

    static isSccsName(path: string): boolean {
        return /(^|\/)s\.[^/]+$/.test(path);
    }

    /** Name of the g-file (in the current directory) for an s-file. */
    static gName(spath: string): string {
        return spath.slice(spath.lastIndexOf('/') + 1).slice(2);
    }

    /** Sibling of the s-file with another prefix ("p.", "x.", ...). */
    static sibling(spath: string, prefix: string): string {
        const slash = spath.lastIndexOf('/');
        return spath.slice(0, slash + 1) + prefix + spath.slice(slash + 3);
    }

    /**
     * File operands: a directory stands for every s-file in it, and "-"
     * for names read from standard input.
     */
    expand(operands: string[]): string[] {
        const out: string[] = [];
        for (const op of operands) {
            if (op === '-') {
                out.push(...(getStdinAsString(this.context) ?? '').split(/\s+/).filter(Boolean));
            } else if (this.isDir(op)) {
                const node = this.fs.resolve(this.abs(op), '/');
                if (!(node instanceof DirectoryNode)) continue;
                const names = [...node.children.keys()].filter(n => n.startsWith('s.')).sort();
                out.push(...names.map(n => (op.endsWith('/') ? op : op + '/') + n));
            } else out.push(op);
        }
        return out;
    }

    read(path: string): string | null {
        try { return this.fs.readFile(this.abs(path), '/'); } catch { return null; }
    }

    /** Reads and parses an s-file, with the conventional diagnostics. */
    load(path: string, allowBadChecksum = false): Loaded {
        if (!SccsEnv.isSccsName(path)) return { ok: false, error: `${path}: not an SCCS file` };
        const info = statPath(this.context, path);
        if (!info) return { ok: false, error: `${path}: No such file or directory` };
        if (info.kind === 'directory') return { ok: false, error: `${path}: Is a directory` };
        if (!canAccess(this.context, info, 4)) return { ok: false, error: `${path}: Permission denied` };
        const text = this.read(path) ?? '';
        const parsed = parseSFile(text);
        if (!parsed.ok) return { ok: false, error: `${path}: ${parsed.error}` };
        if (!parsed.file.checksumOk && !allowBadChecksum) {
            return { ok: false, error: `${path}: corrupted SCCS file (bad checksum: expected ${parsed.file.storedChecksum}, calculated ${parsed.file.computedChecksum})` };
        }
        return { ok: true, file: parsed.file, path };
    }

    /** Rewrites an s-file atomically (via its x-file); s-files are read-only. Returns an error or null. */
    save(path: string, file: SFile): string | null {
        const xpath = this.abs(SccsEnv.sibling(path, 'x.'));
        try {
            if (this.exists(xpath)) this.fs.deleteNode(xpath, '/');
            this.fs.writeFile(xpath, file.serialize(), 'w', undefined, undefined, '/');
            this.fs.chmod(xpath, 0o444, '/');
            this.fs.rename(xpath, this.abs(path), '/');
            return null;
        } catch (e) {
            return `${path}: ${strerror(e)}`;
        }
    }

    /** Creates or replaces a plain file with the given permission bits (masked by umask). */
    writePlain(path: string, text: string, mode: number): string | null {
        const abs = this.abs(path);
        try {
            if (this.exists(abs)) this.fs.deleteNode(abs, '/');
            this.fs.writeFile(abs, text, 'w', undefined, undefined, '/');
            this.fs.chmod(abs, mode & ~this.umask, '/');
            return null;
        } catch (e) {
            return `${path}: ${strerror(e)}`;
        }
    }

    remove(path: string): string | null {
        try { this.fs.deleteNode(this.abs(path), '/'); return null; } catch (e) { return `${path}: ${strerror(e)}`; }
    }

    pEntries(spath: string): PEntry[] {
        const text = this.read(SccsEnv.sibling(spath, 'p.'));
        return text === null ? [] : parsePFile(text);
    }

    /** Rewrites (or removes, when empty) the p-file. */
    savePEntries(spath: string, entries: PEntry[]): string | null {
        const ppath = SccsEnv.sibling(spath, 'p.');
        if (!entries.length) return this.exists(ppath) ? this.remove(ppath) : null;
        return this.writePlain(ppath, entries.map(e => formatPEntry(e) + '\n').join(''), 0o644);
    }

    /** Whether the invoking user may make deltas (empty list: everyone). */
    authorized(file: SFile): boolean {
        if (!file.users.length || this.context.user.uid === 0) return true;
        const name = this.user;
        let allowed = false;
        for (const entry of file.users) {
            const deny = entry.startsWith('!');
            const who = deny ? entry.slice(1) : entry;
            const match = who === name || (/^[0-9]+$/.test(who) && this.groups.includes(parseInt(who, 10)));
            if (match) { if (deny) return false; allowed = true; }
        }
        return allowed;
    }
}
