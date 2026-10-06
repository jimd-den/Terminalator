/**
 * uucp - system-to-system copy (POSIX uucp, Taylor UUCP behaviour).
 *
 *   uucp [-cCdfjmr] [-g grade] [-n user] source-file... destination-file
 *
 * A file name system!path is on a neighbour from /etc/uucp/sys; any other
 * name is local. ~/path means the public directory /var/spool/uucppublic
 * and ~user/path the user's home directory. Local-to-local copies happen
 * at once; transfers to or from a neighbour are queued (see UucpSpool).
 * -j writes the job ID; -m mails the requester when the copy completes;
 * -C copies the source into the spool; -f does not create directories.
 */
import { Utility } from '../shared/Utility';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { getopt } from '../shared/InputFiles';
import { statPath, canAccess } from '../shared/FileInfo';
import { strerror } from '../shared/PathOps';
import { Spool, reply } from '../shared/Spool';
import { UucpSpool, UUCP_PUBLIC } from '../shared/UucpSpool';

const USAGE = 'Usage: uucp [options] file1 [file2 ...] dest\n' +
    'Use uucp --help for help\n';

interface Name { system: string | null; path: string; }

export class UucpCommand extends Utility {
    readonly utility = 'uucp';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'cCdfg:Ijmn:prRs:tWx:u:');
        if (error) return reply(state, '', `uucp: ${error}\n${USAGE}`, 1);
        if (operands.length < 2) return reply(state, '', USAGE, 1);
        const uucp = new UucpSpool(new Spool(context));
        const grade = (opts.get('g') as string | undefined) ?? 'N';
        if (!/^[0-9A-Za-z]$/.test(grade)) return reply(state, '', `uucp: ${grade}: Invalid grade\n`, 1);

        const names: Name[] = [];
        for (const op of operands) {
            const bang = op.indexOf('!');
            const system = bang < 0 ? null : op.substring(0, bang) || uucp.localSystem;
            if (system !== null && !uucp.known(system)) return reply(state, '', `uucp: ${system}: System not found\n`, 1);
            const local = system === null || system === uucp.localSystem;
            const path = bang < 0 ? op : op.substring(bang + 1);
            names.push({ system: local ? null : system, path: local ? this.localPath(path, context, uucp.spool) : this.remotePath(path) });
        }
        const dest = names.pop()!;
        if (names.length > 1 && dest.system === null) {
            const info = statPath(context, dest.path);
            if (!info || info.kind !== 'directory') return reply(state, '', `uucp: ${dest.path}: Not a directory\n`, 1);
        }

        let out = '', err = '';
        for (const src of names) {
            if (src.system !== null && dest.system !== null) { err += 'uucp: Remote to remote copies not supported\n'; continue; }
            if (src.system === null) {
                const info = statPath(context, src.path);
                if (!info) { err += `uucp: ${src.path}: No such file or directory\n`; continue; }
                if (info.kind === 'directory') { err += `uucp: ${src.path}: Is a directory\n`; continue; }
                if (!canAccess(context, info, 4)) { err += `uucp: ${src.path}: Permission denied\n`; continue; }
            }
            const system = dest.system ?? src.system ?? uucp.localSystem;
            const id = uucp.newJobId(system, grade);
            if (opts.has('j')) out += id + '\n';
            if (src.system === null && dest.system === null) {
                const problem = this.copyLocal(context, src.path, dest.path, !opts.has('f'));
                if (problem) { err += `uucp: ${problem}\n`; continue; }
                if (opts.has('m')) {
                    uucp.notify('UUCP succeeded', `REQUEST: ${uucp.localSystem}!${src.path} --> ${uucp.localSystem}!${dest.path} (${uucp.spool.userName})\n(SUCCEEDED)\n`);
                }
            } else if (src.system === null) {
                const data = context.fileSystemService.readFileBuffer(src.path, '/');
                const target = dest.path.endsWith('/') ? dest.path + src.path.split('/').pop() : dest.path;
                const copy = opts.has('C') ? context.fileSystemService.readFile(src.path, '/') : undefined;
                uucp.queue({ id, system, kind: 'send', source: src.path, dest: target, bytes: data.length }, copy);
            } else {
                uucp.queue({ id, system, kind: 'receive', source: src.path, dest: dest.path, bytes: 0 });
            }
        }
        return reply(state, out, err, err ? 1 : 0);
    }

    private localPath(path: string, context: ProcessContext, spool: Spool): string {
        let m: RegExpExecArray | null;
        if ((m = /^~([^/]*)(\/.*)?$/.exec(path))) {
            const base = m[1] ? spool.users.byName(m[1])?.home ?? `/home/${m[1]}` : UUCP_PUBLIC;
            path = base + (m[2] ?? '');
        }
        return context.fileSystemService.resolveAbsolutePath(path, context.cwd);
    }

    private remotePath(path: string): string {
        return path.startsWith('/') || path.startsWith('~') ? path : `~/${path}`;
    }

    /** cp for one file; returns an error message or null. */
    private copyLocal(context: ProcessContext, from: string, to: string, makeDirs: boolean): string | null {
        const fs = context.fileSystemService;
        const target = statPath(context, to)?.kind === 'directory' || to.endsWith('/') ? `${to.replace(/\/$/, '')}/${from.split('/').pop()}` : to;
        try {
            const parent = target.substring(0, target.lastIndexOf('/')) || '/';
            if (!fs.resolve(parent, '/')) {
                if (!makeDirs) return `${parent}: No such file or directory`;
                fs.mkdirp(parent, undefined, undefined, undefined, '/');
            }
            fs.writeFile(target, fs.readFileBuffer(from, '/'), 'w', undefined, undefined, '/');
            return null;
        } catch (e) {
            return `${target}: ${strerror(e)}`;
        }
    }
}
