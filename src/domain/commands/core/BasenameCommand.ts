/**
 * basename - return the non-directory portion of a pathname (POSIX).
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';

export function basename(path: string, suffix?: string): string {
    if (path === '') return '';
    if (/^\/+$/.test(path)) return '/';
    let base = path.replace(/\/+$/, '');
    base = base.substring(base.lastIndexOf('/') + 1);
    if (suffix && base !== suffix && base.endsWith(suffix)) base = base.slice(0, -suffix.length);
    return base;
}

export class BasenameCommand implements ICommand {
    constructor(private fs?: FileSystemService) { }

    execute(args: string[], _context: ProcessContext, state: TerminalState): CommandResponse {
        const operands = args[0] === '--' ? args.slice(1) : args;
        if (operands.length === 0) return { output: '', stderr: 'basename: missing operand\n', exitCode: 1, newState: state };
        if (operands.length > 2) return { output: '', stderr: `basename: extra operand '${operands[2]}'\n`, exitCode: 1, newState: state };
        return { output: basename(operands[0], operands[1]) + '\n', exitCode: 0, newState: state };
    }
}
