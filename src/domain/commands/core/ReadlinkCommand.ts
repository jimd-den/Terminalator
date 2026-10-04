/**
 * readlink - print symbolic link targets or canonical names (GNU):
 * `readlink [-f|-e|-m] [-n] [-q|-s] [-v] [-z] file...`
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { getopt } from '../shared/InputFiles';
import { statPath } from '../shared/FileInfo';
import { canonicalize } from '../shared/PathOps';

export class ReadlinkCommand extends Utility {
    readonly utility = 'readlink';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'femnqsvz');
        if (error) return this.usage(state, error);
        if (!operands.length) return this.usage(state, 'missing operand');
        const mode = opts.has('e') ? 'e' : opts.has('m') ? 'm' : opts.has('f') ? 'f' : null;
        const verbose = opts.has('v') && !opts.has('q') && !opts.has('s');
        const end = opts.has('z') ? '\0' : opts.has('n') && operands.length === 1 ? '' : '\n';
        let out = '';
        const errors: string[] = [];
        for (const file of operands) {
            let result: string | null = null;
            if (mode) result = canonicalize(context, file, mode);
            else {
                const info = statPath(context, file, false);
                if (info?.kind === 'symlink') result = context.fileSystemService.readlink(info.path, '/');
                else if (verbose) errors.push(`${file}: ${info ? 'Invalid argument' : 'No such file or directory'}`);
            }
            if (result === null) {
                if (mode && verbose) errors.push(`${file}: No such file or directory`);
                continue;
            }
            out += result + end;
        }
        const failed = out === '' || errors.length > 0 || operands.length > out.split(end || '\n').filter(Boolean).length;
        return this.respond(state, out, errors, failed ? 1 : 0);
    }
}
