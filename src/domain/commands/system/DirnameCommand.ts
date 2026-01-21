import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class DirnameCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<{ output: string; newState: TerminalState; exitCode: number }> {
        const input = context.stdin;
        const path = args[0] || '';
        const parts = path.split('/').filter(p => p.length > 0);
        parts.pop();
        const dir = parts.length > 0 ? (path.startsWith('/') ? '/' : '') + parts.join('/') : (path.startsWith('/') ? '/' : '.');
        return {
            output: dir,
            newState: state,
            exitCode: 0
        };
    }
}
