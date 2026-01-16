import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class DirnameCommand implements ICommand {
    async execute(args: string[], state: TerminalState): Promise<{ output: string; newState: TerminalState; exitCode: number }> {
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
