/** mkfifo - make FIFO special files (POSIX): `mkfifo [-m mode] file...` */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { getopt } from '../shared/InputFiles';
import { statPath } from '../shared/FileInfo';
import { strerror } from '../shared/PathOps';
import { ModeParser } from '../../services/ModeParser';

export class MkfifoCommand extends Utility {
    readonly utility = 'mkfifo';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'm:');
        if (error) return this.usage(state, error);
        if (!operands.length) return this.usage(state, 'missing operand');
        let mode: number | undefined;
        if (opts.has('m')) {
            try { mode = ModeParser.parse(String(opts.get('m')), 0o666); } catch { return this.usage(state, `invalid mode '${opts.get('m')}'`); }
        }
        const fs = context.fileSystemService;
        const errors: string[] = [];
        for (const file of operands) {
            if (statPath(context, file, false)) { errors.push(`cannot create fifo '${file}': File exists`); continue; }
            try {
                const abs = fs.resolveAbsolutePath(file, context.cwd);
                fs.mkfifo(abs, undefined, undefined, undefined, '/');
                if (mode !== undefined) fs.chmod(abs, mode, '/');
            } catch (e) {
                errors.push(`cannot create fifo '${file}': ${strerror(e)}`);
            }
        }
        return this.respond(state, '', errors);
    }
}
