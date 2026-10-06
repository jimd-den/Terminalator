/**
 * ln - link files (POSIX):
 *   ln [-fs] [-L|-P] source target
 *   ln [-fs] [-L|-P] source... directory
 * plus -n, -v and -i (no terminal answers: never overwrite) from GNU.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { CommandCapability } from '../IStructuredCommand';
import { Utility } from '../shared/Utility';
import { getopt } from '../shared/InputFiles';
import { statPath } from '../shared/FileInfo';
import { canonicalize, strerror } from '../shared/PathOps';
import { basename } from './BasenameCommand';

export class LnCommand extends Utility {
    readonly utility = 'ln';
    readonly capabilities = [CommandCapability.MODIFY];

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'fsLPnvi');
        if (error) return this.usage(state, error);
        if (operands.length === 0) return this.usage(state, 'missing file operand');
        if (operands.length === 1) operands.push('.');

        const fs = context.fileSystemService;
        const lastInfo = statPath(context, operands[operands.length - 1], !opts.has('n'));
        const toDir = lastInfo?.kind === 'directory';
        if (operands.length > 2 && !toDir) return this.usage(state, `target '${operands[operands.length - 1]}': Not a directory`);

        const sources = operands.slice(0, -1);
        const errors: string[] = [];
        let out = '';
        for (const source of sources) {
            const dest = toDir ? `${operands[operands.length - 1]}/${basename(source)}` : operands[operands.length - 1];
            const kind = opts.has('s') ? 'symbolic link' : 'hard link';
            const absDest = fs.resolveAbsolutePath(dest, context.cwd);
            const existing = statPath(context, dest, false);

            if (!opts.has('s')) {
                const src = statPath(context, source, opts.has('L'));
                if (!src) { errors.push(`failed to access '${source}': No such file or directory`); continue; }
                if (src.kind === 'directory') { errors.push(`${source}: hard link not allowed for directory`); continue; }
                if (existing && existing.inode.id === src.inode.id) { errors.push(`'${source}' and '${dest}' are the same file`); continue; }
            }
            if (existing) {
                if (!opts.has('f') || opts.has('i')) { errors.push(`failed to create ${kind} '${dest}': File exists`); continue; }
                if (existing.kind === 'directory') { errors.push(`cannot overwrite directory '${dest}'`); continue; }
                try { fs.deleteNode(absDest, '/'); } catch (e) { errors.push(`cannot remove '${dest}': ${strerror(e)}`); continue; }
            }
            try {
                if (opts.has('s')) fs.symlink(source, absDest, context.user.uid, context.user.gid, '/');
                else {
                    const src = opts.has('L') ? canonicalize(context, source, 'e') ?? source : source;
                    fs.link(fs.resolveAbsolutePath(src, context.cwd), absDest, '/');
                }
                if (opts.has('v')) out += `'${dest}' ${opts.has('s') ? '->' : '=>'} '${source}'\n`;
            } catch (e) {
                errors.push(`failed to create ${kind} '${dest}': ${strerror(e)}`);
            }
        }
        return this.respond(state, out, errors);
    }
}
