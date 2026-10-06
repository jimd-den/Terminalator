/**
 * ls - list directory contents (POSIX XCU ls).
 *
 * Options: -A -C -F -H -L -R -S -a -c -d -f -g -i -k -l -m -n -o -p -q -r
 * -s -t -u -x -1 (and -h for human-readable sizes, a common extension).
 * Multi-column output on a terminal, one name per line into a pipe/file.
 */
import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse, CommandMetadata } from '../../entities/Command';
import { FileSystemService } from '../../services/FileSystemService';
import { DirectoryNode } from '../../entities/filesystem/DirectoryNode';
import { UserDatabase } from '../../services/UserDatabase';
import { FileInfo, kindOf, statPath, canAccess } from '../shared/FileInfo';
import { S_ISUID, S_ISGID, S_ISVTX } from '../../entities/FileSystem';
import { major, minor } from '../../entities/filesystem/Devices';
import { TheatricalVerb } from '../../services/PresentationDirector';

interface Entry {
    name: string;   // as displayed (operand text or directory entry name)
    info: FileInfo;
    target?: string; // symlink target
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SIX_MONTHS_MS = 182 * 24 * 3600 * 1000;
const TYPE_CHAR: Record<string, string> = { regular: '-', directory: 'd', symlink: 'l', char: 'c', block: 'b', fifo: 'p', socket: 's' };

export function modeString(mode: number): string {
    const kind = kindOf(mode);
    const rwx = (bits: number, special: boolean, specialChar: string) =>
        (bits & 4 ? 'r' : '-') + (bits & 2 ? 'w' : '-') +
        (special ? (bits & 1 ? specialChar : specialChar.toUpperCase()) : (bits & 1 ? 'x' : '-'));
    return TYPE_CHAR[kind] +
        rwx((mode >> 6) & 7, (mode & S_ISUID) !== 0, 's') +
        rwx((mode >> 3) & 7, (mode & S_ISGID) !== 0, 's') +
        rwx(mode & 7, (mode & S_ISVTX) !== 0, 't');
}

export function lsDate(ms: number, now = Date.now()): string {
    const d = new Date(ms);
    const day = String(d.getDate()).padStart(2, ' ');
    const recent = Math.abs(now - ms) < SIX_MONTHS_MS;
    const tail = recent
        ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        : ` ${d.getFullYear()}`;
    return `${MONTHS[d.getMonth()]} ${day} ${tail}`;
}

function humanSize(n: number): string {
    if (n < 1024) return String(n);
    const units = ['K', 'M', 'G', 'T'];
    let v = n;
    let u = -1;
    do { v /= 1024; u++; } while (v >= 1024 && u < units.length - 1);
    return (v < 10 ? (Math.ceil(v * 10) / 10).toFixed(1) : String(Math.ceil(v))) + units[u];
}

export class LsCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.LIST];
    public readonly utility = 'ls';

    constructor(private fsService: FileSystemService) { super(); }

    public getMetadata(): CommandMetadata {
        return { verb: TheatricalVerb.SCAN, style: 'NORMAL' };
    }

    executeInternal(_args: string[], flags: Set<string>, operands: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const fs = context.fileSystemService || context.fileSystemService;
        const users = new UserDatabase(fs);
        const f = (c: string) => flags.has(c);
        const unknown = [...flags].find(c => !'ACFHLRSacdfgiklmnopqrstux1h'.includes(c));
        if (unknown) {
            return { output: '', stderr: `ls: invalid option -- '${unknown}'\n`, exitCode: 2, newState: state };
        }

        const long = f('l') || f('n') || f('g') || f('o');
        const all = f('a') || f('f');
        const almostAll = f('A');
        const tty = context.stdoutIsTty !== false;
        const format: 'long' | 'single' | 'columns' | 'across' | 'commas' =
            long ? 'long' : f('1') ? 'single' : f('m') ? 'commas' : f('x') ? 'across' : f('C') ? 'columns' : tty ? 'columns' : 'single';
        const timeOf = (e: Entry) => (f('c') ? e.info.inode.ctime : f('u') ? e.info.inode.atime : e.info.inode.mtime);
        const blocks = (e: Entry) => Math.ceil(e.info.inode.size / 1024) || (e.info.kind === 'directory' ? 4 : 0);

        const sortEntries = (list: Entry[]) => {
            if (f('f')) return list;
            const byName = (a: Entry, b: Entry) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
            list.sort((a, b) => {
                if (f('S')) return b.info.inode.size - a.info.inode.size || byName(a, b);
                if (f('t')) return timeOf(b) - timeOf(a) || byName(a, b);
                return byName(a, b);
            });
            if (f('r')) list.reverse();
            return list;
        };

        const indicator = (e: Entry) => {
            if (f('F')) {
                if (e.info.kind === 'directory') return '/';
                if (e.info.kind === 'symlink') return '@';
                if (e.info.kind === 'fifo') return '|';
                if (e.info.kind === 'socket') return '=';
                if (e.info.inode.mode & 0o111) return '*';
            } else if (f('p') && e.info.kind === 'directory') {
                return '/';
            }
            return '';
        };

        const display = (e: Entry) => {
            const name = f('q') ? e.name.replace(/[\x00-\x1f\x7f]/g, '?') : e.name;
            return name + indicator(e);
        };

        const longLine = (e: Entry, widths: number[]) => {
            const ino = e.info.inode;
            const cols: string[] = [];
            if (f('i')) cols.push(String(ino.id).padStart(widths[0]));
            if (f('s')) cols.push(String(blocks(e)).padStart(widths[1]));
            cols.push(modeString(ino.mode));
            cols.push(String(ino.links ?? 1).padStart(widths[2]));
            if (!f('g')) cols.push((f('n') ? String(ino.uid) : users.userName(ino.uid)).padEnd(widths[3]));
            if (!f('o')) cols.push((f('n') ? String(ino.gid) : users.groupName(ino.gid)).padEnd(widths[4]));
            const size = e.info.kind === 'char' || e.info.kind === 'block'
                ? `${major(ino.rdev ?? 0)}, ${minor(ino.rdev ?? 0)}`
                : f('h') ? humanSize(ino.size) : String(ino.size);
            cols.push(size.padStart(widths[5]));
            cols.push(lsDate(timeOf(e)));
            let name = display(e);
            if (e.info.kind === 'symlink' && e.target !== undefined) name += ` -> ${e.target}`;
            cols.push(name);
            return cols.join(' ');
        };

        const render = (list: Entry[], isDirListing: boolean): string => {
            if (list.length === 0) return isDirListing && (long || f('s')) ? 'total 0\n' : '';
            let out = '';
            if (isDirListing && (long || f('s'))) {
                out += `total ${list.reduce((n, e) => n + blocks(e), 0)}\n`;
            }
            if (format === 'long') {
                const w = [0, 0, 0, 0, 0, 0];
                for (const e of list) {
                    const ino = e.info.inode;
                    w[0] = Math.max(w[0], String(ino.id).length);
                    w[1] = Math.max(w[1], String(blocks(e)).length);
                    w[2] = Math.max(w[2], String(ino.links ?? 1).length);
                    w[3] = Math.max(w[3], (f('n') ? String(ino.uid) : users.userName(ino.uid)).length);
                    w[4] = Math.max(w[4], (f('n') ? String(ino.gid) : users.groupName(ino.gid)).length);
                    w[5] = Math.max(w[5], (f('h') ? humanSize(ino.size) : String(ino.size)).length);
                }
                return out + list.map(e => longLine(e, w)).join('\n') + '\n';
            }
            const names = list.map(e => (f('i') ? `${e.info.inode.id} ` : '') + (f('s') ? `${blocks(e)} ` : '') + display(e));
            if (format === 'single') return out + names.join('\n') + '\n';
            if (format === 'commas') return out + names.join(', ') + '\n';
            return out + this.columns(names, parseInt(context.env.COLUMNS ?? state.environment.COLUMNS ?? '80', 10) || 80, format === 'across');
        };

        const readDir = (info: FileInfo): Entry[] | string => {
            const node = fs.resolve(info.path, '/');
            if (!(node instanceof DirectoryNode)) return [];
            if (!canAccess(context, info, 4)) return 'Permission denied';
            const entries: Entry[] = [];
            const pseudo: [string, string][] = all ? [['.', info.path], ['..', info.path === '/' ? '/' : info.path.substring(0, info.path.lastIndexOf('/')) || '/']] : [];
            for (const [name, path] of pseudo) {
                const st = statPath(context, path);
                if (st) entries.push({ name, info: st });
            }
            for (const name of node.children.keys()) {
                if (name.startsWith('.') && !all && !almostAll) continue;
                const childPath = info.path === '/' ? `/${name}` : `${info.path}/${name}`;
                const st = statPath(context, childPath, f('L'));
                if (!st) continue;
                entries.push({ name, info: st, target: st.kind === 'symlink' ? this.readlink(fs, childPath) : undefined });
            }
            return sortEntries(entries);
        };

        let exitCode = 0;
        const errors: string[] = [];
        const fileOperands: Entry[] = [];
        const dirOperands: Entry[] = [];
        const targets = operands.length ? operands : ['.'];

        for (const op of targets) {
            const followCmdline = f('L') || f('H') || (!long && !f('d') && !f('F'));
            let info = statPath(context, op, followCmdline);
            if (!info) info = statPath(context, op, false);
            if (!info) {
                errors.push(`ls: cannot access '${op}': No such file or directory`);
                exitCode = 2;
                continue;
            }
            const entry: Entry = { name: op, info, target: info.kind === 'symlink' ? this.readlink(fs, info.path) : undefined };
            if (info.kind === 'directory' && !f('d')) dirOperands.push(entry);
            else fileOperands.push(entry);
        }

        let output = render(sortEntries(fileOperands), false);
        const showHeaders = targets.length > 1 || f('R');
        const queue = sortEntries(dirOperands);
        let first = fileOperands.length === 0;

        const listDir = (dir: Entry, header: string) => {
            const listing = readDir(dir.info);
            if (!first) output += '\n';
            first = false;
            if (showHeaders) output += `${header}:\n`;
            if (typeof listing === 'string') {
                errors.push(`ls: cannot open directory '${header}': ${listing}`);
                exitCode = 2;
                return;
            }
            output += render(listing, true);
            if (f('R')) {
                for (const child of listing) {
                    if (child.info.kind !== 'directory' || child.name === '.' || child.name === '..') continue;
                    listDir(child, header === '/' ? `/${child.name}` : `${header}/${child.name}`);
                }
            }
        };
        for (const dir of queue) listDir(dir, dir.name);

        const pretty = format === 'columns' && tty && !f('R') && operands.length <= 1 && dirOperands.length === 1;
        const items = pretty ? (readDir(dirOperands[0].info) as Entry[] | string) : [];
        return {
            output,
            stderr: errors.length ? errors.join('\n') + '\n' : undefined,
            newState: state,
            exitCode,
            metadata: pretty && Array.isArray(items) ? {
                renderType: 'fish-style',
                data: { items: items.map(e => ({ name: e.name, type: e.info.kind === 'directory' ? 'dir' : 'file' })) },
            } : undefined,
        };
    }

    private readlink(fs: FileSystemService, path: string): string | undefined {
        try {
            return fs.readlink(path, '/');
        } catch {
            return undefined;
        }
    }

    /** GNU-style column layout: fewest rows whose total width fits `width`. */
    private columns(names: string[], width: number, across: boolean): string {
        const n = names.length;
        for (let cols = Math.min(n, Math.max(1, Math.floor(width / 3))); cols >= 1; cols--) {
            const rows = Math.ceil(n / cols);
            const at = (r: number, c: number) => (across ? r * cols + c : c * rows + r);
            const colWidths: number[] = [];
            for (let c = 0; c < cols; c++) {
                let w = 0;
                for (let r = 0; r < rows; r++) {
                    const i = at(r, c);
                    if (i < n) w = Math.max(w, names[i].length);
                }
                colWidths.push(w);
            }
            const total = colWidths.reduce((a, b) => a + b, 0) + 2 * (cols - 1);
            if (total > width && cols > 1) continue;
            const lines: string[] = [];
            for (let r = 0; r < rows; r++) {
                let line = '';
                for (let c = 0; c < cols; c++) {
                    const i = at(r, c);
                    if (i >= n) continue;
                    const isLastInRow = c === cols - 1 || at(r, c + 1) >= n;
                    line += isLastInRow ? names[i] : names[i].padEnd(colWidths[c] + 2);
                }
                lines.push(line);
            }
            return lines.join('\n') + '\n';
        }
        return names.join('\n') + '\n';
    }
}
