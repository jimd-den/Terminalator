/**
 * kill - terminate or signal processes (POSIX):
 *   kill -s signal_name pid...    kill -signal_name pid...    kill -l [exit_status]
 * Targets are process ids or job ids (%n); permissions follow kill(2).
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { processTableFor } from '../../entities/ProcessTable';
import { Utility } from '../shared/Utility';
import { DEFAULT_SIGNAL, getSignalName, listSignals, parseSignal } from '../../entities/Signal';

export class KillCommand extends Utility {
    readonly utility = 'kill';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        if (args[0] === '-l' || args[0] === '-L') {
            if (args[1] === undefined) return this.respond(state, listSignals().join(' ') + '\n');
            const n = Number(args[1]);
            const name = Number.isInteger(n) ? getSignalName(n > 128 ? n - 128 : n) : parseSignal(args[1]) !== undefined ? String(parseSignal(args[1])) : undefined;
            if (name === undefined) return this.usage(state, `${args[1]}: invalid signal specification`);
            return this.respond(state, name + '\n');
        }

        let signal = DEFAULT_SIGNAL;
        let i = 0;
        if (args[0] === '-s' || args[0] === '-n') {
            const parsed = args[1] !== undefined ? parseSignal(args[1]) : undefined;
            if (parsed === undefined) return this.usage(state, `${args[1] ?? ''}: invalid signal specification`);
            signal = parsed;
            i = 2;
        } else if (args[0]?.startsWith('-') && args[0] !== '--' && args[0].length > 1 && !/^-[0-9]+$/.test(args[0]) || /^-[0-9]+$/.test(args[0] ?? '') && args.length > 1) {
            const parsed = parseSignal(args[0].substring(1));
            if (parsed === undefined) return this.usage(state, `${args[0].substring(1)}: invalid signal specification`);
            signal = parsed;
            i = 1;
        }
        if (args[i] === '--') i++;
        const targets = args.slice(i);
        if (!targets.length) return this.usage(state, 'usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]', 2);

        const table = context.processes ?? processTableFor(context.fileSystemService.fileSystem);
        const errors: string[] = [];
        for (const t of targets) {
            if (t.startsWith('%')) {
                const res = context.jobControl?.sendSignal(t, signal);
                if (!res?.success) errors.push(`${t}: no such job`);
                continue;
            }
            if (!/^-?[0-9]+$/.test(t)) { errors.push(`${t}: arguments must be process or job IDs`); continue; }
            const pid = Number(t);
            if (pid <= 0) continue; // process groups: the simulation has one per session
            const job = context.jobControl?.getJobByPid(pid);
            if (job) { context.jobControl!.sendSignal(String(pid), signal); continue; }
            const res = table.signal(pid, signal, context.user);
            if (res === 'ESRCH') errors.push(`(${pid}) - No such process`);
            else if (res === 'EPERM') errors.push(`(${pid}) - Operation not permitted`);
        }
        return this.respond(state, '', errors);
    }
}
