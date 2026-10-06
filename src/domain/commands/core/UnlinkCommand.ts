/** unlink - call unlink(2) (POSIX): `unlink file`. */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { statPath } from '../shared/FileInfo';
import { strerror } from '../shared/PathOps';

export class UnlinkCommand extends Utility {
    readonly utility = 'unlink';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const operands = args[0] === '--' ? args.slice(1) : args;
        if (operands.length !== 1) return this.usage(state, operands.length ? `extra operand '${operands[1]}'` : 'missing operand');
        const file = operands[0];
        const info = statPath(context, file, false);
        if (!info) return this.usage(state, `cannot unlink '${file}': No such file or directory`);
        if (info.kind === 'directory') return this.usage(state, `cannot unlink '${file}': Is a directory`);
        try {
            context.fileSystemService.deleteNode(context.fileSystemService.resolveAbsolutePath(file, context.cwd), '/');
        } catch (e) {
            return this.usage(state, `cannot unlink '${file}': ${strerror(e)}`);
        }
        return this.respond(state, '');
    }
}
