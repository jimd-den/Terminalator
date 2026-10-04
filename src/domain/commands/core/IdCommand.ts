/**
 * id - return user identity (POSIX): `id [user]`, `id -G [-n] [user]`,
 * `id -g [-nr] [user]`, `id -u [-nr] [user]`. Names come from the host's
 * /etc/passwd and /etc/group.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { IdentityService } from '../../services/IdentityService';
import { UserDatabase } from '../../services/UserDatabase';
import { getopt } from '../shared/InputFiles';

export class IdCommand implements ICommand {
    constructor(private identityService?: IdentityService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const fail = (msg: string) => ({ output: '', stderr: `id: ${msg}\n`, exitCode: 1, newState: state });
        const { opts, operands, error } = getopt(args, 'GgnruZ');
        if (error) return fail(error);
        if (operands.length > 1) return fail(`extra operand '${operands[1]}'`);
        const modes = ['G', 'g', 'u'].filter(m => opts.has(m));
        if (modes.length > 1) return fail('cannot print "only" of more than one choice');
        if ((opts.has('n') || opts.has('r')) && modes.length === 0) return fail('cannot print only names or real IDs in default format');

        const db = new UserDatabase(context.fileSystemService);
        let uid = context.user.uid, gid = context.user.gid, groups = context.user.groups;
        if (operands.length) {
            const spec = operands[0];
            const user = db.byName(spec) ?? (/^[0-9]+$/.test(spec) ? db.byUid(parseInt(spec, 10)) : undefined);
            if (!user) return fail(`'${spec}': no such user`);
            uid = user.uid; gid = user.gid; groups = user.groups;
        }
        const allGroups = Array.from(new Set([gid, ...groups]));
        const uname = (n: number) => db.byUid(n)?.username;
        const gname = (n: number) => db.groupByGid(n)?.groupname;
        const names = opts.has('n');

        let line: string;
        if (opts.has('u')) line = names ? uname(uid) ?? String(uid) : String(uid);
        else if (opts.has('g')) line = names ? gname(gid) ?? String(gid) : String(gid);
        else if (opts.has('G')) line = allGroups.map(g => (names ? gname(g) ?? String(g) : String(g))).join(' ');
        else {
            const fmt = (n: number, name?: string) => (name ? `${n}(${name})` : String(n));
            line = `uid=${fmt(uid, uname(uid))} gid=${fmt(gid, gname(gid))} groups=${allGroups.map(g => fmt(g, gname(g))).join(',')}`;
        }
        return { output: line + '\n', exitCode: 0, newState: state };
    }
}
