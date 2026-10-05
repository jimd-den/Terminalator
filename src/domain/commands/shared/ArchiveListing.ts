/**
 * ArchiveListing - the verbose member listings of the archivers:
 *
 *   GNU tar -tv   "-rw-r--r-- user/group      6 2024-01-02 03:04 name"
 *   GNU cpio -tv  "-rw-r--r--   1 user     group           6 Jan  2  2024 name"
 *   pax -v        "-rw-r--r--  1 user     group            6 Jan  2  2024 name"
 */
import { ArchiveEntry, entryMode, entrySize } from '../../utils/ArchiveEntry';
import { modeString, lsDate } from '../core/LsCommand';
import { NameCache } from './ArchiveFs';

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

/** "YYYY-MM-DD HH:MM" in local time, as GNU tar prints it. */
export function tarDate(seconds: number): string {
    const d = new Date(seconds * 1000);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function modeOf(e: ArchiveEntry): string {
    const s = modeString(entryMode(e));
    return e.kind === 'hardlink' ? 'h' + s.slice(1) : s;
}

/** GNU tar's long listing; the user/group/size column widens as needed across calls. */
export class TarLister {
    private ugswidth = 19;

    line(e: ArchiveEntry, names?: NameCache): string {
        const user = e.uname || (names?.userName(e.uid) ?? String(e.uid));
        const group = e.gname || (names?.groupName(e.gid) ?? String(e.gid));
        const size = e.kind === 'char' || e.kind === 'block' ? `${e.devmajor},${e.devminor}` : String(entrySize(e));
        const used = user.length + 1 + group.length + 1 + size.length;
        if (used > this.ugswidth) this.ugswidth = used;
        const name = e.kind === 'dir' ? e.name.replace(/\/?$/, '/') : e.name;
        let line = `${modeOf(e)} ${user}/${group} ${size.padStart(this.ugswidth - used + size.length)} ${tarDate(e.mtime)} ${name}`;
        if (e.kind === 'symlink') line += ` -> ${e.linkname}`;
        if (e.kind === 'hardlink') line += ` link to ${e.linkname}`;
        return line;
    }
}

function ownerNames(e: ArchiveEntry, names: NameCache, preferStored: boolean): [string, string] {
    const user = (preferStored && e.uname) || names.userName(e.uid) || String(e.uid);
    const group = (preferStored && e.gname) || names.groupName(e.gid) || String(e.gid);
    return [user, group];
}

function sizeColumn(e: ArchiveEntry, width: number): string {
    if (e.kind === 'char' || e.kind === 'block') return `${String(e.devmajor).padStart(3)}, ${String(e.devminor).padStart(3)}`.padStart(width);
    return String(entrySize(e)).padStart(width);
}

/** GNU cpio -tv. */
export function cpioLine(e: ArchiveEntry, names: NameCache): string {
    const [user, group] = ownerNames(e, names, false);
    const nlink = e.nlink ?? (e.kind === 'dir' ? 2 : 1);
    let line = `${modeString(entryMode(e))} ${String(nlink).padStart(3)} ${user.padEnd(8)} ${group.padEnd(8)} ${sizeColumn(e, 8)} ${lsDate(e.mtime * 1000)} ${e.name}`;
    if (e.kind === 'symlink') line += ` -> ${e.linkname}`;
    return line;
}

/** pax -v (list mode). */
export function paxLine(e: ArchiveEntry, names: NameCache): string {
    const [user, group] = ownerNames(e, names, true);
    const nlink = e.nlink ?? (e.kind === 'dir' || e.kind === 'hardlink' ? 2 : 1);
    const mode = e.kind === 'hardlink' ? modeString(0o100000 | e.mode) : modeString(entryMode(e));
    let line = `${mode} ${String(nlink).padStart(2)} ${user.padEnd(8)} ${group.padEnd(8)} ${sizeColumn(e, 9)} ${lsDate(e.mtime * 1000)} ${e.name}`;
    if (e.kind === 'symlink') line += ` -> ${e.linkname}`;
    if (e.kind === 'hardlink') line += ` == ${e.linkname}`;
    return line;
}
