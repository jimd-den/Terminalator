/**
 * uname - return system name (POSIX): `uname [-amnrsv]` plus GNU -o -p -i.
 * Values come from the host's own /etc/hostname and /proc files.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { getopt } from '../shared/InputFiles';

export class UnameCommand extends Utility {
    readonly utility = 'uname';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'amnrsvopi');
        if (error) return this.usage(state, error);
        if (operands.length) return this.usage(state, `extra operand '${operands[0]}'`);
        const read = (path: string, fallback: string) => {
            try { return context.fileSystemService.readFile(path).trim() || fallback; } catch { return fallback; }
        };
        const version = read('/proc/version', '');
        const values: Record<string, string> = {
            s: read('/proc/sys/kernel/ostype', 'Linux'),
            n: read('/etc/hostname', 'localhost'),
            r: read('/proc/sys/kernel/osrelease', '6.6.0'),
            v: /#[^\n]*/.exec(version)?.[0] ?? '#1 SMP PREEMPT',
            m: /aarch64|x86_64|arm/.exec(read('/proc/cpuinfo', ''))?.[0] ?? 'aarch64',
            o: 'GNU/Linux',
        };
        let order = ['s', 'n', 'r', 'v', 'm', 'p', 'i', 'o'].filter(k => opts.has(k));
        if (opts.has('a')) order = ['s', 'n', 'r', 'v', 'm', 'o'];
        if (order.length === 0) order = ['s'];
        const out = order.map(k => (k === 'p' || k === 'i' ? 'unknown' : values[k])).join(' ');
        return this.respond(state, out + '\n');
    }
}
