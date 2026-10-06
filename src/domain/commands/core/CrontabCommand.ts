/**
 * crontab - schedule periodic background work (POSIX crontab).
 *
 *   crontab [-u user] [file | -]
 *   crontab [-u user] -e | -l | -r [-i]
 *
 * Each user's table lives in /var/spool/cron/crontabs/<user> (mode 0600,
 * owned by the user), as with Debian's cron. A new table is syntax-checked
 * first (see CronTable) and rejected with cronie's diagnostics. `-e` copies
 * the table to a temporary file and runs $VISUAL or $EDITOR (default vi) on
 * it through sh(1), then installs the result.
 */
import { Utility } from '../shared/Utility';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { getopt, readInput } from '../shared/InputFiles';
import { Spool, reply, shellQuote } from '../shared/Spool';
import { checkCrontab } from '../shared/CronTable';

const SPOOL = '/var/spool/cron/crontabs';
const USAGE = 'usage:\tcrontab [-u user] file\n' +
    '\tcrontab [-u user] [ -e | -l | -r ]\n' +
    '\t\t(default operation is replace, per 1003.2)\n' +
    '\t-e\t(edit user\'s crontab)\n' +
    '\t-l\t(list user\'s crontab)\n' +
    '\t-r\t(delete user\'s crontab)\n' +
    '\t-i\t(prompt before deleting user\'s crontab)\n';

export class CrontabCommand extends Utility {
    readonly utility = 'crontab';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const { opts, operands, error } = getopt(args, 'u:elri');
        if (error) return reply(state, '', `crontab: ${error}\n${USAGE}`, 1);
        const actions = ['e', 'l', 'r'].filter(o => opts.has(o));
        if (actions.length > 1) return reply(state, '', `crontab: usage error: only one operation permitted\n${USAGE}`, 1);
        const spool = new Spool(context);

        let user = spool.userName;
        let owner = { uid: context.user.uid, gid: context.user.gid };
        if (opts.has('u')) {
            const name = opts.get('u') as string;
            if (!spool.isRoot && name !== user) return reply(state, '', 'must be privileged to use -u\n', 1);
            const pw = spool.users.byName(name);
            if (!pw) return reply(state, '', `crontab: user \`${name}' unknown\n`, 1);
            user = pw.username;
            owner = { uid: pw.uid, gid: pw.gid };
        }
        const table = `${SPOOL}/${user}`;

        switch (actions[0]) {
            case 'l': {
                if (operands.length) return reply(state, '', `crontab: usage error: no arguments permitted after this option\n${USAGE}`, 1);
                const text = spool.read(table);
                return text === null ? reply(state, '', `no crontab for ${user}\n`, 1) : reply(state, text, '', 0);
            }
            case 'r': {
                if (operands.length) return reply(state, '', `crontab: usage error: no arguments permitted after this option\n${USAGE}`, 1);
                if (!spool.exists(table)) return reply(state, '', `no crontab for ${user}\n`, 1);
                if (opts.has('i')) {
                    const answer = (context.stdinLegacy ?? '').trimStart();
                    const prompt = `crontab: really delete ${user}'s crontab? (y/n) `;
                    if (!/^y/i.test(answer)) return reply(state, prompt, '', 0);
                    spool.remove(table);
                    return reply(state, prompt, '', 0);
                }
                spool.remove(table);
                return reply(state, '', '', 0);
            }
            case 'e':
                if (operands.length) return reply(state, '', `crontab: usage error: no arguments permitted after this option\n${USAGE}`, 1);
                return this.edit(spool, context, state, user, table, owner);
        }

        if (operands.length !== 1) {
            return reply(state, '', `crontab: usage error: ${operands.length ? 'too many arguments' : 'file name or - (for stdin) must be specified'}\n${USAGE}`, 1);
        }
        const input = readInput(context, operands[0]);
        if (!input.ok) return reply(state, '', `${input.error}\n`, 1);
        return this.install(spool, state, input.data, operands[0], table, owner, '');
    }

    /** Checks and installs a new table; `prefix` is earlier stderr text. */
    private install(spool: Spool, state: TerminalState, text: string, name: string, table: string, owner: { uid: number; gid: number }, prefix: string): CommandResponse {
        if (text !== '' && !text.endsWith('\n')) {
            return reply(state, '', `${prefix}new crontab file is missing newline before EOF, can't install.\n`, 1);
        }
        const errors = checkCrontab(text);
        if (errors.length) {
            const lines = errors.map(e => `"${name}":${e.line}: ${e.message}\n`).join('');
            return reply(state, '', `${prefix}${lines}errors in crontab file, can't install.\n`, 1);
        }
        spool.ensureDir(SPOOL, 0o1730);
        spool.write(table, text, 0o600, owner.uid, owner.gid);
        return reply(state, '', prefix, 0);
    }

    private async edit(spool: Spool, context: ProcessContext, state: TerminalState, user: string, table: string, owner: { uid: number; gid: number }): Promise<CommandResponse> {
        let notice = '';
        let original = spool.read(table);
        if (original === null) {
            notice = `no crontab for ${user} - using an empty one\n`;
            original = '';
        }
        const editor = context.env.VISUAL || context.env.EDITOR || 'vi';
        const tmp = `/tmp/crontab.${(context.pid ?? 4242).toString(36).toUpperCase().padStart(6, 'X')}`;
        spool.write(tmp, original, 0o600, context.user.uid, context.user.gid);
        if (!context.spawn) return reply(state, '', `${notice}crontab: cannot run ${editor}\n`, 1);
        const status = await context.spawn(['sh', '-c', `${editor} ${shellQuote(tmp)}`]);
        const edited = spool.read(tmp);
        try { spool.remove(tmp); } catch { /* already gone */ }
        if (status !== 0) return reply(state, '', `${notice}crontab: "${editor}" exited with status ${status}\n`, 1);
        if (edited === null) return reply(state, '', `${notice}crontab: ${tmp}: No such file or directory\n`, 1);
        if (edited === original && spool.exists(table)) return reply(state, '', `${notice}crontab: no changes made to crontab\n`, 0);
        if (edited === original && edited === '') return reply(state, '', `${notice}crontab: no changes made to crontab\n`, 0);
        const res = this.install(spool, state, edited, tmp, table, owner, notice);
        if (res.exitCode !== 0) return res;
        return reply(state, '', `${notice}crontab: installing new crontab\n`, 0);
    }
}
