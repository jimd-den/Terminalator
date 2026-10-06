/** link - call link(2) (POSIX): `link file1 file2`. */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { statPath } from '../shared/FileInfo';
import { strerror } from '../shared/PathOps';

export class LinkCommand extends Utility {
    readonly utility = 'link';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const operands = args[0] === '--' ? args.slice(1) : args;
        if (operands.length !== 2) return this.usage(state, operands.length < 2 ? 'missing operand' : `extra operand '${operands[2]}'`);
        const [from, to] = operands;
        const fs = context.fileSystemService;
        const src = statPath(context, from, false);
        if (!src) return this.usage(state, `cannot create link '${to}' to '${from}': No such file or directory`);
        if (src.kind === 'directory') return this.usage(state, `cannot create link '${to}' to '${from}': Operation not permitted`);
        if (statPath(context, to, false)) return this.usage(state, `cannot create link '${to}' to '${from}': File exists`);
        try {
            fs.link(fs.resolveAbsolutePath(from, context.cwd), fs.resolveAbsolutePath(to, context.cwd), '/');
        } catch (e) {
            return this.usage(state, `cannot create link '${to}' to '${from}': ${strerror(e)}`);
        }
        return this.respond(state, '');
    }
}
