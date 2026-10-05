/**
 * ArchiveFs - moves archive members between the simulated file system and
 * the format-neutral ArchiveEntry model; shared by tar, pax and cpio.
 *
 *   ArchiveCollector  walks operands (stat/lstat, readdir in name order,
 *                     hard-link detection) and produces entries
 *   ArchiveExtractor  creates files, directories, links, FIFOs and devices
 *                     from entries, restoring mode/owner/mtime as asked;
 *                     directory attributes are applied last (finish()) so
 *                     read-only directories can still be filled
 */
import { ProcessContext } from '../../entities/ProcessContext';
import { DirectoryNode } from '../../entities/filesystem/DirectoryNode';
import { S_IFCHR, S_IFBLK } from '../../entities/FileSystem';
import { FileSystemService } from '../../services/FileSystemService';
import { UserDatabase } from '../../services/UserDatabase';
import { ArchiveEntry, EntryKind } from '../../utils/ArchiveEntry';
import { FileInfo, statPath, canAccess } from './FileInfo';
import { strerror } from './PathOps';
import { patternToRegexSource } from '../../services/shell/expansion/PatternMatcher';

/** fnmatch(3) without FNM_PATHNAME: '*' also matches '/' (cpio and pax member patterns). */
export function matchesPattern(pattern: string, name: string): boolean {
    try {
        return new RegExp('^' + patternToRegexSource(pattern) + '$', 's').test(name);
    } catch {
        return pattern === name;
    }
}

/** Memoised user/group database lookups for one command run. */
export class NameCache {
    private db: UserDatabase;
    private users = new Map<number, string | undefined>();
    private groups = new Map<number, string | undefined>();
    constructor(fs: FileSystemService) { this.db = new UserDatabase(fs); }

    userName(uid: number): string | undefined {
        if (!this.users.has(uid)) this.users.set(uid, this.db.byUid(uid)?.username);
        return this.users.get(uid);
    }
    groupName(gid: number): string | undefined {
        if (!this.groups.has(gid)) this.groups.set(gid, this.db.groupByGid(gid)?.groupname);
        return this.groups.get(gid);
    }
    uidOf(name: string | undefined, fallback: number): number {
        return (name ? this.db.byName(name)?.uid : undefined) ?? fallback;
    }
    gidOf(name: string | undefined, fallback: number): number {
        return (name ? this.db.groupByName(name)?.gid : undefined) ?? fallback;
    }
}

/**
 * Creates or truncates `path` (relative to the process cwd) with `data`,
 * permission-checked as the process user. Returns an strerror text on failure.
 */
export function writeArchive(context: ProcessContext, umask: number, path: string, data: Uint8Array): string | null {
    const fs = context.fileSystemService.asUser(context.user, umask);
    try {
        const info = statPath(context, path);
        if (info?.kind === 'directory') return 'Is a directory';
        if (info && !canAccess(context, info, 2)) return 'Permission denied';
        fs.writeFile(fs.resolveAbsolutePath(path, context.cwd), data, 'w', undefined, undefined, '/');
        return null;
    } catch (e) {
        return strerror(e);
    }
}

export type CollectError ={ path: string; op: 'stat' | 'open' | 'opendir' | 'readlink'; reason: string };

export interface CollectOptions {
    /** Follow every symbolic link (tar -h, pax -L, cpio -L). */
    follow?: boolean;
    /** Follow symbolic links named on the command line only (pax -H). */
    followArgs?: boolean;
    /** Descend into directories (false for pax -d). */
    recurse?: boolean;
    /** Represent repeated inodes as 'hardlink' entries (tar, ustar); cpio keeps ino/nlink instead. */
    hardlinks?: boolean;
    /** Paths (absolute) to leave out, e.g. the archive being written. */
    skip?: (abs: string, info: FileInfo) => string | null;
}

const KIND_OF: Record<string, EntryKind | undefined> = {
    regular: 'file', directory: 'dir', symlink: 'symlink', char: 'char', block: 'block', fifo: 'fifo',
};

export class ArchiveCollector {
    private seen = new Map<number, string>();
    private names: NameCache;

    constructor(private readonly context: ProcessContext, private readonly opts: CollectOptions = {}) {
        this.names = new NameCache(context.fileSystemService);
    }

    /**
     * Calls `visit` for `operand` (member name `name`, resolved against
     * `baseDir`) and, for directories, everything below it.
     */
    collect(operand: string, baseDir: string, visit: (e: ArchiveEntry, abs: string) => void, onError: (e: CollectError) => void, name = operand): void {
        const fs = this.context.fileSystemService;
        const abs = fs.resolveAbsolutePath(operand, baseDir);
        this.walk(abs, name, true, visit, onError);
    }

    private walk(abs: string, name: string, top: boolean, visit: (e: ArchiveEntry, abs: string) => void, onError: (e: CollectError) => void): void {
        const ctx = { ...this.context, cwd: '/' };
        const follow = this.opts.follow || (top && this.opts.followArgs);
        const info = statPath(ctx, abs, !!follow) ?? (follow ? statPath(ctx, abs, false) : null);
        if (!info) { onError({ path: name, op: 'stat', reason: 'No such file or directory' }); return; }
        const skipReason = this.opts.skip?.(abs, info);
        if (skipReason) { onError({ path: name, op: 'stat', reason: skipReason }); return; }
        const kind = KIND_OF[info.kind];
        if (!kind) { onError({ path: name, op: 'stat', reason: 'socket ignored' }); return; }

        const ino = info.inode;
        const entry: ArchiveEntry = {
            name, kind, mode: ino.mode & 0o7777, uid: ino.uid, gid: ino.gid,
            uname: this.names.userName(ino.uid) ?? '', gname: this.names.groupName(ino.gid) ?? '',
            mtime: Math.floor(ino.mtime / 1000), data: new Uint8Array(0), linkname: '',
            devmajor: kind === 'char' || kind === 'block' ? ((ino.rdev ?? 0) >> 8) & 0xfff : 0,
            devminor: kind === 'char' || kind === 'block' ? (ino.rdev ?? 0) & 0xff : 0,
            ino: ino.id, nlink: ino.links, dev: 0x801,
        };

        if (kind !== 'dir' && ino.links > 1) {
            const first = this.seen.get(ino.id);
            if (first !== undefined && this.opts.hardlinks) {
                visit({ ...entry, kind: 'hardlink', linkname: first }, abs);
                return;
            }
            if (first === undefined) this.seen.set(ino.id, name);
        }

        if (kind === 'symlink') {
            try { entry.linkname = this.context.fileSystemService.readlink(abs, '/'); }
            catch (e) { onError({ path: name, op: 'readlink', reason: strerror(e) }); return; }
        } else if (kind === 'file') {
            if (!canAccess(ctx, info, 4)) { onError({ path: name, op: 'open', reason: 'Permission denied' }); return; }
            try { entry.data = this.context.fileSystemService.readFileBuffer(abs, '/', this.context.user); }
            catch (e) { onError({ path: name, op: 'open', reason: strerror(e) }); return; }
        }
        visit(entry, abs);

        if (kind !== 'dir' || this.opts.recurse === false) return;
        if (!canAccess(ctx, info, 4) || !canAccess(ctx, info, 1)) { onError({ path: name, op: 'opendir', reason: 'Permission denied' }); return; }
        const node = this.context.fileSystemService.resolve(abs, '/', !!follow);
        if (!(node instanceof DirectoryNode)) return;
        const children = Array.from(node.children.keys()).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        const prefix = name.endsWith('/') ? name : name + '/';
        for (const child of children) this.walk(abs === '/' ? `/${child}` : `${abs}/${child}`, prefix + child, false, visit, onError);
    }
}

export interface ExtractOptions {
    /** Directory member names are relative to. */
    baseDir: string;
    umask: number;
    /** Keep the archived permission bits (else mode & ~umask). */
    preservePerms: boolean;
    /** chown to the archived owner (only effective for root). */
    preserveOwner: boolean;
    /** Restore archived modification times. */
    restoreMtime: boolean;
    /** Existing files: replace them, keep them (error), or replace only when the member is newer. */
    existing: 'replace' | 'keep' | 'newer';
    /** Create missing parent directories. */
    makeParents: boolean;
}

export type ExtractResult =
    | { ok: true }
    | { ok: false; op: 'open' | 'mkdir' | 'link' | 'symlink' | 'mknod' | 'exists' | 'newer'; reason: string };

export class ArchiveExtractor {
    private fs: FileSystemService;
    private names: NameCache;
    private deferred: { abs: string; mode: number; mtime: number; uid: number; gid: number }[] = [];
    private readonly root: boolean;

    constructor(private readonly context: ProcessContext, private readonly opts: ExtractOptions) {
        this.fs = context.fileSystemService.asUser(context.user, opts.umask);
        this.names = new NameCache(context.fileSystemService);
        this.root = context.user.uid === 0;
    }

    absolute(name: string): string {
        return this.fs.resolveAbsolutePath(name, this.opts.baseDir);
    }

    extract(e: ArchiveEntry, name = e.name): ExtractResult {
        const abs = this.absolute(name);
        const ctx = { ...this.context, cwd: '/' };
        const existing = statPath(ctx, abs, false);
        const mode = this.opts.preservePerms ? e.mode & 0o7777 : e.mode & 0o777 & ~this.opts.umask;
        const uid = this.names.uidOf(e.uname, e.uid);
        const gid = this.names.gidOf(e.gname, e.gid);

        if (this.opts.makeParents) {
            const parent = abs.substring(0, abs.lastIndexOf('/')) || '/';
            if (!statPath(ctx, parent)) {
                try { this.fs.mkdirp(parent, 0o777 & ~this.opts.umask, undefined, undefined, '/'); }
                catch (err) { return { ok: false, op: 'mkdir', reason: strerror(err) }; }
            }
        }

        try {
            if (e.kind === 'dir') {
                if (existing && existing.kind !== 'directory') this.fs.deleteNode(abs, '/');
                if (!existing || existing.kind !== 'directory') this.fs.mkdir(abs, 0o700 | mode, undefined, undefined, '/');
                this.deferred.push({ abs, mode, mtime: e.mtime, uid, gid });
                return { ok: true };
            }
            if (existing) {
                if (this.opts.existing === 'keep') return { ok: false, op: 'exists', reason: 'File exists' };
                if (this.opts.existing === 'newer' && existing.inode.mtime >= e.mtime * 1000) {
                    return { ok: false, op: 'newer', reason: 'newer or same age version exists' };
                }
                if (existing.kind === 'directory') return { ok: false, op: 'open', reason: 'Is a directory' };
                this.fs.deleteNode(abs, '/');
            }
        } catch (err) {
            return { ok: false, op: e.kind === 'dir' ? 'mkdir' : 'open', reason: strerror(err) };
        }

        const op = e.kind === 'hardlink' ? 'link' : e.kind === 'symlink' ? 'symlink' : e.kind === 'file' ? 'open' : 'mknod';
        try {
            switch (e.kind) {
                case 'file':
                    this.fs.writeFile(abs, e.data, 'w', undefined, undefined, '/');
                    break;
                case 'hardlink': {
                    const target = this.absolute(e.linkname);
                    if (!statPath(ctx, target, false)) return { ok: false, op, reason: 'No such file or directory' };
                    this.fs.link(target, abs, '/');
                    return { ok: true };
                }
                case 'symlink':
                    this.fs.symlink(e.linkname, abs, this.context.user.uid, this.context.user.gid, '/');
                    break;
                case 'fifo':
                    this.fs.mkfifo(abs, mode, undefined, undefined, '/');
                    break;
                case 'char':
                case 'block':
                    if (!this.root) return { ok: false, op, reason: 'Operation not permitted' };
                    this.fs.mknod(abs, (e.kind === 'char' ? S_IFCHR : S_IFBLK) | mode, (e.devmajor << 8) | e.devminor, uid, gid, '/');
                    break;
            }
        } catch (err) {
            return { ok: false, op, reason: strerror(err) };
        }
        this.applyAttributes(abs, e.kind, mode, e.mtime, uid, gid);
        return { ok: true };
    }

    /** Applies the postponed directory modes and times (deepest first). */
    finish(): void {
        for (const d of this.deferred.reverse()) this.applyAttributes(d.abs, 'dir', d.mode, d.mtime, d.uid, d.gid);
        this.deferred = [];
    }

    private applyAttributes(abs: string, kind: EntryKind, mode: number, mtime: number, uid: number, gid: number): void {
        const ctx = { ...this.context, cwd: '/' };
        if (this.root && this.opts.preserveOwner) {
            try { this.context.fileSystemService.chown(abs, uid, gid, '/'); } catch { /* best effort */ }
            const info = statPath(ctx, abs, false);
            if (info && kind === 'symlink') { info.inode.uid = uid; info.inode.gid = gid; }
        }
        if (kind !== 'symlink') {
            try { this.fs.chmod(abs, mode, '/'); } catch { /* not the owner: leave the mode */ }
        }
        if (this.opts.restoreMtime) {
            const info = statPath(ctx, abs, false);
            if (info) info.inode.mtime = mtime * 1000;
        }
    }
}
