/**
 * tty - return the user's terminal name (POSIX).
 * Exit 0 if standard input is a terminal, 1 if not, 2 on usage error.
 */
import { ICommand } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { FileSystemService } from '../../services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { isTty } from '../../services/shell/io/IOContext';

export class TtyCommand implements ICommand {
    constructor(private fs?: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const silent = args.includes('-s');
        const bad = args.find(a => a !== '-s');
        if (bad) return { output: '', stderr: `tty: extra operand '${bad}'\n`, exitCode: 2, newState: state };
        const terminal = isTty(context.stdin);
        if (silent) return { output: '', exitCode: terminal ? 0 : 1, newState: state };
        return { output: terminal ? '/dev/pts/0\n' : 'not a tty\n', exitCode: terminal ? 0 : 1, newState: state };
    }
}
