/**
 * ar - create and maintain library archives (POSIX, GNU ar compatible):
 *
 *   ar -d [-v] archive file...
 *   ar -m [-v] [-a|-b|-i posname] archive file...
 *   ar -p [-v] [-s] archive [file...]
 *   ar -q [-cv] archive file...
 *   ar -r [-cuv] [-a|-b|-i posname] archive file...
 *   ar -t [-v] [-s] archive [file...]
 *   ar -x [-v] [-sCTo] archive [file...]
 *   ar -s archive
 *
 * The key may also be given GNU style without '-' (`ar rcs lib.a f.o`).
 * Archives use the common "!<arch>" format with GNU "//" long names
 * (utils/ArArchive). Like GNU ar on Debian/Ubuntu, deterministic mode (D)
 * is the default: members get date 0, uid/gid 0 and mode 644; U records the
 * real values. Members are matched by the basename of each file operand.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { readInputBytes } from '../shared/InputFiles';
import { statPath } from '../shared/FileInfo';
import { strerror } from '../shared/PathOps';
import { writeArchive } from '../shared/ArchiveFs';
import { ArMember, decodeAr, encodeAr, ArError } from '../../utils/ArArchive';
import { decodeStream } from '../../services/shell/io/OutputSink';
import { modeString } from './LsCommand';
import { basename } from './BasenameCommand';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** GNU ar -tv date: "%b %e %H:%M %Y". */
function arDate(seconds: number): string {
    const d = new Date(seconds * 1000);
    const two = (n: number) => String(n).padStart(2, '0');
    return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2)} ${two(d.getHours())}:${two(d.getMinutes())} ${d.getFullYear()}`;
}

export class ArCommand extends Utility {
    readonly utility = 'ar';
    readonly capabilities = [CommandCapability.MODIFY];

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        // Key letters: the first argument (with or without '-') and any further '-' clusters before the archive.
        let i = 0;
        let key = '';
        while (i < args.length && (i === 0 || (args[i].startsWith('-') && args[i] !== '-'))) {
            if (args[i] === '--') { i++; break; }
            key += args[i].replace(/^-/, '');
            i++;
        }
        const ops = key.replace(/[^dmpqrstx]/g, '');
        const mods = new Set(key.replace(/[dmpqrtx]/g, ''));
        for (const c of key) {
            if (!'dmpqrstxabicDUuvsSTCoNPlf'.includes(c)) return this.usage(state, `invalid option -- '${c}'`);
        }
        const op = ops.replace(/s/g, '') || (ops.includes('s') ? 's' : '');
        if (!op) return this.usage(state, 'no operation specified');
        if (op.length > 1) return this.usage(state, 'two different operation options specified');
        const positional = mods.has('a') || mods.has('b') || mods.has('i');
        const posname = positional ? args[i++] : undefined;
        const archive = args[i++];
        if (!archive) return this.usage(state, 'no archive specified');
        const files = args.slice(i);

        const errors: string[] = [];
        const out: string[] = [];
        const deterministic = !mods.has('U');
        const verbose = mods.has('v');
        if (mods.has('u') && deterministic && (op === 'r')) {
            errors.push("`u' modifier ignored since `D' is the default (see `U')");
        }

        // Load the archive.
        let members: ArMember[] = [];
        const info = statPath(context, archive);
        if (info) {
            const input = readInputBytes(context, archive);
            if (!input.ok) return this.respond(state, '', [input.error], 1);
            try { members = decodeAr(input.data); }
            catch (e) { return this.respond(state, '', [`${archive}: ${e instanceof ArError ? e.message : strerror(e)}`], 1); }
        } else if (op === 'r' || op === 'q') {
            if (!mods.has('c')) errors.push(`creating ${archive}`);
        } else {
            return this.respond(state, '', [`${archive}: No such file or directory`], 1);
        }

        const find = (file: string) => members.findIndex(m => m.name === (mods.has('P') ? file : basename(file)));
        let modified = false;
        let status = 0;
        const notFound = (f: string) => { errors.push(`no entry ${f} in archive`); status = 1; };

        switch (op) {
            case 't':
            case 'p':
            case 'x': {
                const targets = files.length ? files.map(f => ({ f, idx: find(f) })) : members.map((_, idx) => ({ f: members[idx].name, idx }));
                const bytes: Uint8Array[] = [];
                for (const { f, idx } of targets) {
                    if (idx < 0) { notFound(f); continue; }
                    const m = members[idx];
                    if (op === 't') {
                        out.push(verbose ? `${modeString(m.mode | 0o100000).slice(1)} ${m.uid}/${m.gid} ${String(m.data.length).padStart(6)} ${arDate(m.date)} ${m.name}\n` : `${m.name}\n`);
                    } else if (op === 'p') {
                        if (verbose) bytes.push(new TextEncoder().encode(`\n<${m.name}>\n\n`));
                        bytes.push(m.data);
                    } else {
                        if (verbose) out.push(`x - ${m.name}\n`);
                        const err = this.extract(context, state, m, mods.has('o'), mods.has('C'));
                        if (err) { errors.push(err); status = 1; }
                    }
                }
                if (op === 'p') {
                    const all = new Uint8Array(bytes.reduce((n, b) => n + b.length, 0));
                    let off = 0;
                    for (const b of bytes) { all.set(b, off); off += b.length; }
                    const { text, binary } = decodeStream(all);
                    return this.respond(state, text, errors, status, binary);
                }
                break;
            }
            case 'd':
                for (const f of files) {
                    const idx = find(f);
                    if (idx < 0) { if (verbose) out.push(`No member named '${f}'\n`); continue; }
                    if (verbose) out.push(`d - ${members[idx].name}\n`);
                    members.splice(idx, 1);
                    modified = true;
                }
                break;
            case 'm': {
                const moving: ArMember[] = [];
                for (const f of files) {
                    const idx = find(f);
                    if (idx < 0) { errors.push(`no entry ${f} in archive`); status = 1; continue; }
                    if (verbose) out.push(`m - ${members[idx].name}\n`);
                    moving.push(...members.splice(idx, 1));
                }
                members.splice(this.insertAt(members, posname, mods, find), 0, ...moving);
                modified = true;
                break;
            }
            case 'q':
            case 'r': {
                const added: ArMember[] = [];
                for (const f of files) {
                    const member = this.memberFor(context, f, deterministic, mods.has('P'));
                    if (typeof member === 'string') { errors.push(member); status = 1; continue; }
                    const idx = op === 'r' ? find(f) : -1;
                    if (idx >= 0) {
                        if (mods.has('u') && !deterministic && members[idx].date >= member.date) continue;
                        members[idx] = member;
                        if (verbose) out.push(`r - ${member.name}\n`);
                    } else {
                        added.push(member);
                        if (verbose) out.push(`a - ${member.name}\n`);
                    }
                }
                if (status) return this.respond(state, out.join(''), errors, status);
                members.splice(op === 'r' && positional ? this.insertAt(members, posname, mods, find) : members.length, 0, ...added);
                modified = true;
                break;
            }
            case 's':
                modified = true;
                break;
        }

        if (modified) {
            const err = writeArchive(context, state.umask ?? 0o022, archive, encodeAr(members));
            if (err) { errors.push(`${archive}: ${err}`); status = 1; }
        }
        return this.respond(state, out.join(''), errors, status);
    }

    /** Index for -a/-b/-i posname (default: the end). */
    private insertAt(members: ArMember[], posname: string | undefined, mods: Set<string>, find: (f: string) => number): number {
        if (posname === undefined) return members.length;
        const idx = find(posname);
        if (idx < 0) return members.length;
        return mods.has('a') ? idx + 1 : idx;
    }

    private memberFor(context: ProcessContext, file: string, deterministic: boolean, fullPath: boolean): ArMember | string {
        const info = statPath(context, file);
        if (!info) return `${file}: No such file or directory`;
        if (info.kind === 'directory') return `${file}: Is a directory`;
        const input = readInputBytes(context, file);
        if (!input.ok) return input.error;
        return {
            name: fullPath ? file : basename(file),
            date: deterministic ? 0 : Math.floor(info.inode.mtime / 1000),
            uid: deterministic ? 0 : info.inode.uid,
            gid: deterministic ? 0 : info.inode.gid,
            mode: deterministic ? 0o644 : info.inode.mode,
            data: input.data,
        };
    }

    private extract(context: ProcessContext, state: TerminalState, m: ArMember, keepDate: boolean, noReplace: boolean): string | null {
        const fs = context.fileSystemService.asUser(context.user, state.umask ?? 0o022);
        const abs = fs.resolveAbsolutePath(m.name, context.cwd);
        try {
            const existing = statPath(context, abs, false);
            if (existing && noReplace) return null;
            if (existing) fs.deleteNode(abs, '/');
            fs.writeFile(abs, m.data, 'w', undefined, undefined, '/');
            fs.chmod(abs, m.mode & 0o7777, '/');
            if (keepDate) {
                const info = statPath(context, abs, false);
                if (info) info.inode.mtime = m.date * 1000;
            }
            return null;
        } catch (e) {
            return `${m.name}: ${strerror(e)}`;
        }
    }
}
