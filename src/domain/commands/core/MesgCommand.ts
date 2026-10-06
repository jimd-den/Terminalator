/**
 * mesg - permit or deny messages (POSIX): mesg [y|n]
 * Toggles group write permission on the terminal device (/dev/pts/N), which
 * is what write(1) and talk(1) check. Exit status: 0 receiving allowed,
 * 1 denied, >1 error.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { isTty } from '../../services/shell/io/IOContext';
import { Utility } from '../shared/Utility';
import { strerror } from '../shared/PathOps';
import { statPath } from '../shared/FileInfo';

export const SESSION_TTY = '/dev/pts/0';
const S_IWGRP = 0o020;

export class MesgCommand extends Utility {
    readonly utility = 'mesg';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        let verbose = false;
        const operands: string[] = [];
        for (const a of args) {
            if (a === '-v' || a === '--verbose') verbose = true;
            else if (a === '--') continue;
            else if (a.startsWith('-') && a !== '-') return this.usage(state, `invalid option -- '${a.substring(1)}'`, 2);
            else operands.push(a);
        }
        if (operands.length > 1) return this.usage(state, `extra operand '${operands[1]}'`, 2);
        const op = operands[0];
        if (op !== undefined && !/^(y|n|yes|no)$/i.test(op)) return this.usage(state, `invalid argument: '${op}'`, 2);
        if (!isTty(context.stdin)) return this.usage(state, 'ttyname failed: Inappropriate ioctl for device', 2);

        const fsys = context.fileSystemService;
        const info = statPath(context, SESSION_TTY);
        if (!info) return this.usage(state, `${SESSION_TTY}: No such file or directory`, 2);
        const mode = info.inode.mode & 0o7777;

        if (op === undefined) {
            const on = (mode & S_IWGRP) !== 0;
            return this.respond(state, on ? 'is y\n' : 'is n\n', [], on ? 0 : 1);
        }
        const on = /^y/i.test(op);
        try {
            fsys.chmod(SESSION_TTY, on ? mode | S_IWGRP : mode & ~S_IWGRP, '/', context.user);
        } catch (e) {
            return this.usage(state, `change ${SESSION_TTY} mode failed: ${strerror(e)}`, 2);
        }
        const msg = verbose ? (on ? 'write access to your terminal is allowed\n' : 'write access to your terminal is denied\n') : '';
        return this.respond(state, msg, [], on ? 0 : 1);
    }
}
