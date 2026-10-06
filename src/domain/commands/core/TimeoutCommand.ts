/**
 * timeout - run a command with a time limit (GNU coreutils):
 * `timeout [-s signal] [-k duration] [--foreground] [--preserve-status] duration command [args]`.
 * Exits 124 if the command timed out, 125 on timeout's own errors, else the command's status.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { parseSignal } from '../../entities/Signal';

function duration(s: string): number | null {
    const m = /^([0-9]*\.?[0-9]+)([smhd]?)$/.exec(s);
    if (!m) return null;
    return parseFloat(m[1]) * ({ '': 1, s: 1, m: 60, h: 3600, d: 86400 } as Record<string, number>)[m[2]];
}

export class TimeoutCommand extends Utility {
    readonly utility = 'timeout';

    constructor(private fs?: FileSystemService) { super(); }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        let i = 0;
        let preserve = false;
        for (; i < args.length; i++) {
            const a = args[i];
            if (a === '--foreground' || a === '-v' || a === '--verbose') continue;
            if (a === '--preserve-status') { preserve = true; continue; }
            if (a === '-s' || a === '-k') {
                const v = args[++i];
                if (v === undefined || (a === '-s' ? parseSignal(v) === undefined : duration(v) === null)) {
                    return this.usage(state, `invalid ${a === '-s' ? 'signal' : 'time interval'} '${v ?? ''}'`, 125);
                }
                continue;
            }
            if (a.startsWith('--signal=') || a.startsWith('--kill-after=')) continue;
            if (a === '--') { i++; break; }
            if (a.startsWith('-') && a.length > 1) return this.usage(state, `invalid option -- '${a.substring(1)}'`, 125);
            break;
        }
        const limit = duration(args[i] ?? '');
        if (limit === null) return this.usage(state, args[i] === undefined ? 'missing operand' : `invalid time interval '${args[i]}'`, 125);
        const argv = args.slice(i + 1);
        if (!argv.length) return this.usage(state, 'missing operand', 125);

        if (limit === 0) {
            const status = await context.spawn!(argv);
            return this.respond(state, '', [], status);
        }
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timedOut = new Promise<'timeout'>(resolve => { timer = setTimeout(() => resolve('timeout'), limit * 1000); });
        const result = await Promise.race([context.spawn!(argv), timedOut]);
        if (timer) clearTimeout(timer);
        if (result === 'timeout') return this.respond(state, '', [], preserve ? 143 : 124);
        return this.respond(state, '', [], result);
    }
}
