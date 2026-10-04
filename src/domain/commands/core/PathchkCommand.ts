/**
 * pathchk - check pathnames (POSIX): `pathchk [-p] [-P] pathname...`
 * Checks PATH_MAX/NAME_MAX limits and search permission on existing
 * directories; -p applies the portable limits and character set.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { getopt } from '../shared/InputFiles';
import { statPath, canAccess } from '../shared/FileInfo';

export class PathchkCommand extends Utility {
    readonly utility = 'pathchk';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'pP');
        if (error) return this.usage(state, error);
        if (!operands.length) return this.usage(state, 'missing operand');
        const portable = opts.has('p');
        const pathMax = portable ? 256 : 4096;
        const nameMax = portable ? 14 : 255;
        const errors: string[] = [];
        for (const path of operands) {
            if (path === '' ) { errors.push("'': No such file or directory"); continue; }
            if (opts.has('P') && path.split('/').some(c => c.startsWith('-'))) { errors.push(`leading '-' in a component of file name '${path}'`); continue; }
            if (path.length >= pathMax) { errors.push(`limit ${pathMax - 1} exceeded by length ${path.length} of file name '${path}'`); continue; }
            const comps = path.split('/').filter(Boolean);
            const long = comps.find(c => c.length > nameMax);
            if (long) { errors.push(`limit ${nameMax} exceeded by length ${long.length} of file name component '${long}'`); continue; }
            if (portable) {
                const bad = /[^A-Za-z0-9._\/-]/.exec(path);
                if (bad) { errors.push(`nonportable character '${bad[0]}' in file name '${path}'`); continue; }
                continue;
            }
            // Existing leading directories must be searchable.
            let prefix = path.startsWith('/') ? '' : '.';
            for (const c of comps.slice(0, -1)) {
                prefix += '/' + c;
                const info = statPath(context, prefix);
                if (!info) break;
                if (info.kind !== 'directory') { errors.push(`'${prefix}': Not a directory`); break; }
                if (!canAccess(context, info, 1)) { errors.push(`'${prefix}': Permission denied`); break; }
            }
        }
        return this.respond(state, '', errors);
    }
}
