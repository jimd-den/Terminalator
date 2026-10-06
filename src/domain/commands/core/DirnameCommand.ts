/**
 * dirname - return the directory portion of a pathname (POSIX).
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';

export function dirname(path: string): string {
    if (path === '') return '.';
    if (/^\/+$/.test(path)) return '/';
    let p = path.replace(/\/+$/, '');
    const idx = p.lastIndexOf('/');
    if (idx === -1) return '.';
    p = p.substring(0, idx).replace(/\/+$/, '');
    return p === '' ? '/' : p;
}

export class DirnameCommand implements ICommand {
    constructor(private fs?: FileSystemService) { }

    execute(args: string[], _context: ProcessContext, state: TerminalState): CommandResponse {
        const operands = args[0] === '--' ? args.slice(1) : args;
        if (operands.length === 0) return { output: '', stderr: 'dirname: missing operand\n', exitCode: 1, newState: state };
        return { output: operands.map(dirname).join('\n') + '\n', exitCode: 0, newState: state };
    }
}
