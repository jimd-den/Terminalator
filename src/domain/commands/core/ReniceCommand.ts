/**
 * renice - set nice values of running processes (POSIX):
 * `renice [-g|-p|-u] -n increment ID...` and the historical `renice priority [-p] pid...`.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { processTableFor } from '../../entities/ProcessTable';
import { Utility } from '../shared/Utility';
import { UserDatabase } from '../../services/UserDatabase';

export class ReniceCommand extends Utility {
    readonly utility = 'renice';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        if (!args.length) return this.usage(state, 'usage: renice [-n] priority [-p|--pid] pid...');
        let mode = 'p' as 'p' | 'g' | 'u';
        let value: number | undefined;
        let relative = false;
        const ids: string[] = [];
        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            if (a === '-n') { value = Number(args[++i]); relative = true; continue; }
            if (a === '-p' || a === '-g' || a === '-u') { mode = a[1] as 'p'; continue; }
            if (value === undefined && /^-?[0-9]+$/.test(a)) { value = Number(a); continue; }
            ids.push(a);
        }
        if (value === undefined || !Number.isInteger(value)) return this.usage(state, 'invalid priority');
        if (!ids.length) return this.usage(state, 'no process specified');

        const table = context.processes ?? processTableFor(context.fileSystemService.fileSystem);
        const db = new UserDatabase(context.fileSystemService);
        const errors: string[] = [];
        let out = '';
        const kind = { p: 'process ID', g: 'process group ID', u: 'user ID' }[mode];
        for (const id of ids) {
            if (mode !== 'u' && !/^[0-9]+$/.test(id)) { errors.push(`bad ${kind} value: ${id}`); continue; }
            const uid = mode === 'u' ? (/^[0-9]+$/.test(id) ? Number(id) : db.byName(id)?.uid) : undefined;
            if (mode === 'u' && uid === undefined) { errors.push(`unknown user ${id}`); continue; }
            const targets = table.list().filter(p => (mode === 'u' ? p.uid === uid : p.pid === Number(id)));
            if (!targets.length) { errors.push(`failed to get priority for ${id} (${kind}): No such process`); continue; }
            const old = targets[0].nice;
            let denied = false;
            for (const p of targets) {
                if (table.renice(p.pid, relative ? p.nice + value : value, context.user) === 'EPERM') denied = true;
            }
            if (denied) { errors.push(`failed to set priority for ${id} (${kind}): Permission denied`); continue; }
            out += `${mode === 'u' ? uid : id} (${kind}) old priority ${old}, new priority ${targets[0].nice}\n`;
        }
        return this.respond(state, out, errors);
    }
}
