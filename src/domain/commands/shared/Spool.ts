import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { FileSystemService } from '../../services/FileSystemService';
import { UserDatabase } from '../../services/UserDatabase';
import { DirectoryNode } from '../../entities/filesystem/DirectoryNode';

/**
 * Spool - shared plumbing for the batch/queueing utilities (at, crontab,
 * lp, mailx, uucp). On a real system these are setuid/setgid helpers that
 * write into protected spool directories under /var/spool on the user's
 * behalf; here they do the same through a privileged view of the file
 * system and stamp each file with the requesting user's ownership.
 */
export class Spool {
    /** A file system view without credential checks (the setuid helper). */
    readonly fs: FileSystemService;
    readonly users: UserDatabase;

    constructor(readonly context: ProcessContext) {
        this.fs = (context.fileSystemService as any).asUser(undefined) as FileSystemService;
        this.users = new UserDatabase(this.fs);
    }

    /** Login name of the invoking user (getpwuid(getuid())). */
    get userName(): string {
        return this.users.byUid(this.context.user.uid)?.username ?? String(this.context.user.uid);
    }

    get isRoot(): boolean {
        return this.context.user.uid === 0;
    }

    /** gethostname(): /etc/hostname, as installed on every host. */
    hostname(): string {
        return (this.read('/etc/hostname') ?? 'localhost').trim() || 'localhost';
    }

    /** Creates `path` (and parents) owned by root unless it exists. */
    ensureDir(path: string, mode: number, uid = 0, gid = 0): void {
        if (this.fs.resolve(path, '/')) return;
        this.fs.mkdirp(path, mode, uid, gid, '/');
        this.fs.chmod(path, mode, '/');
        this.fs.chown(path, uid, gid, '/');
    }

    exists(path: string): boolean {
        return this.fs.resolve(path, '/') !== null;
    }

    read(path: string): string | null {
        try {
            const node = this.fs.resolve(path, '/');
            if (!node || this.fs.isDirectory(node)) return null;
            return this.fs.readFile(path, '/');
        } catch {
            return null;
        }
    }

    /** Writes a spool file with explicit ownership and mode. */
    write(path: string, data: string, mode: number, uid: number, gid: number, append = false): void {
        this.fs.writeFile(path, data, append ? 'a' : 'w', uid, gid, '/');
        this.fs.chmod(path, mode, '/');
        this.fs.chown(path, uid, gid, '/');
    }

    remove(path: string): void {
        this.fs.deleteNode(path, '/');
    }

    /** Names in a directory, sorted (readdir minus dot files). */
    list(dir: string): string[] {
        const node = this.fs.resolve(dir, '/');
        if (!(node instanceof DirectoryNode)) return [];
        return Array.from(node.children.keys()).filter(n => !n.startsWith('.')).sort();
    }

    /** Modification time of a spool file (ms since the epoch). */
    mtime(path: string): number {
        const node = this.fs.resolve(path, '/');
        const inode = node ? this.fs.getInode(node.inodeId) : undefined;
        return inode?.mtime ?? Date.now();
    }

    /**
     * Allocates the next number from a sequence file (like atd's .SEQ),
     * stored in `radix`. The first number handed out is 1.
     */
    nextSequence(path: string, radix = 10): number {
        const last = parseInt((this.read(path) ?? '0').trim() || '0', radix) || 0;
        const next = last + 1;
        this.write(path, next.toString(radix) + '\n', 0o600, 0, 0);
        return next;
    }
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const p2 = (n: number) => String(n).padStart(2, '0');

/** asctime(3)/ctime(3) without the newline: "Sun Oct  4 19:30:00 2026". */
export function asctime(d: Date): string {
    return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, ' ')} ` +
        `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())} ${d.getFullYear()}`;
}

/** RFC 5322 date: "Sun, 04 Oct 2026 19:30:00 +0000". */
export function rfc5322Date(d: Date): string {
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    const abs = Math.abs(off);
    return `${DAYS[d.getDay()]}, ${p2(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ` +
        `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())} ${sign}${p2(Math.floor(abs / 60))}${p2(abs % 60)}`;
}

/** Single-quotes a word for /bin/sh. */
export function shellQuote(word: string): string {
    return /^[A-Za-z0-9_@%+=:,./-]+$/.test(word) ? word : `'${word.replace(/'/g, `'\\''`)}'`;
}

/**
 * A response with stdout and verbatim stderr text: these utilities print
 * many diagnostics without the "name: " prefix that Utility.respond adds.
 */
export function reply(state: TerminalState, output: string, stderr: string, exitCode: number): CommandResponse {
    return { output, stderr: stderr || undefined, exitCode, newState: state };
}
