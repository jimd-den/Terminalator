/**
 * mkdir - make directories (POSIX): `mkdir [-p] [-m mode] dir...` (+ GNU -v).
 * New directories get 0777 & ~umask (or -m mode); with -p, missing
 * intermediate directories get (0777 & ~umask) | u+wx and existing
 * directories are not an error. Permissions are enforced by the file system.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { getopt } from '../shared/InputFiles';
import { statPath } from '../shared/FileInfo';
import { strerror } from '../shared/PathOps';
import { ModeParser } from '../../services/ModeParser';

export class MkdirCommand extends Utility {
    readonly utility = 'mkdir';
    readonly capabilities = [CommandCapability.MODIFY];

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'pm:v');
        if (error) return this.usage(state, error);
        if (!operands.length) return this.usage(state, 'missing operand');
        const umask = state.umask ?? 0o022;
        let mode: number | undefined;
        if (opts.has('m')) {
            try { mode = ModeParser.parse(String(opts.get('m')), 0o777 & ~umask); } catch { return this.usage(state, `invalid mode '${opts.get('m')}'`); }
        }
        const fs = context.fileSystemService;
        const errors: string[] = [];
        let out = '';

        const make = (path: string, perm: number | undefined): boolean => {
            try {
                const abs = fs.resolveAbsolutePath(path, context.cwd);
                fs.mkdir(abs, undefined, undefined, undefined, '/');
                if (perm !== undefined) fs.chmod(abs, perm, '/');
                if (opts.has('v')) out += `mkdir: created directory '${path}'\n`;
                return true;
            } catch (e) {
                errors.push(`cannot create directory '${path}': ${strerror(e)}`);
                return false;
            }
        };

        for (const dir of operands) {
            if (opts.has('p')) {
                const parts = dir.split('/');
                let prefix = dir.startsWith('/') ? '' : '.';
                let ok = true;
                for (let i = 0; i < parts.length && ok; i++) {
                    if (parts[i] === '' && i > 0) continue;
                    prefix = i === 0 && dir.startsWith('/') ? '/' : `${prefix === '/' ? '' : prefix}/${parts[i]}`;
                    if (i === 0 && dir.startsWith('/')) continue;
                    const isLast = parts.slice(i + 1).every(p => p === '');
                    const shown = prefix.replace(/^\.\//, '');
                    const info = statPath(context, prefix);
                    if (info) {
                        if (info.kind !== 'directory') { errors.push(`cannot create directory '${isLast ? shown : dir}': ${isLast ? 'File exists' : 'Not a directory'}`); ok = false; }
                        continue;
                    }
                    ok = make(shown, isLast ? mode : (0o777 & ~umask) | 0o300);
                }
                continue;
            }
            if (statPath(context, dir, false)) { errors.push(`cannot create directory '${dir}': File exists`); continue; }
            make(dir, mode);
        }
        return this.respond(state, out, errors);
    }
}
