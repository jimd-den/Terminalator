/**
 * uux - remote command execution (POSIX uux, Taylor UUCP behaviour).
 *
 *   uux [-jnp] [-g grade] [-] command-string...
 *
 * The command string is "[system!]command [arguments]"; arguments of the
 * form system!file name files, and "> [system!]file" redirects output.
 * Commands for a neighbour from /etc/uucp/sys are queued (see UucpSpool);
 * commands for the local system (no prefix, or "!" / "<host>!") are run at
 * once by sh with output discarded unless redirected, and a failure is
 * reported to the requester by mail unless -n. -p or - passes standard
 * input to the command; -j writes the job ID.
 */
import { Utility } from '../shared/Utility';
import { ProcessContext, getStdinAsString } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { Spool, reply } from '../shared/Spool';
import { UucpSpool } from '../shared/UucpSpool';

const USAGE = 'Usage: uux [options] command\nUse uux --help for help\n';

export class UuxCommand extends Utility {
    readonly utility = 'uux';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const flags = new Set<string>();
        let grade = 'A';
        let i = 0;
        for (; i < args.length; i++) {
            const a = args[i];
            if (a === '--') { i++; break; }
            if (a === '-') { flags.add('p'); continue; }
            if (!a.startsWith('-')) break;
            for (let j = 1; j < a.length; j++) {
                const c = a[j];
                if (c === 'g' || c === 'a' || c === 's' || c === 'x' || c === 'u' || c === 'W') {
                    const v = a.substring(j + 1) || args[++i];
                    if (v === undefined) return reply(state, '', `uux: option requires an argument -- '${c}'\n${USAGE}`, 1);
                    if (c === 'g') grade = v;
                    break;
                }
                if (!'bcCIjlnprz'.includes(c)) return reply(state, '', `uux: invalid option -- '${c}'\n${USAGE}`, 1);
                flags.add(c);
            }
        }
        const command = args.slice(i).join(' ').trim();
        if (!command) return reply(state, '', USAGE, 1);
        if (!/^[0-9A-Za-z]$/.test(grade)) return reply(state, '', `uux: ${grade}: Invalid grade\n`, 1);
        let depth = 0;
        for (const ch of command) {
            depth += ch === '(' ? 1 : ch === ')' ? -1 : 0;
            if (depth < 0) break;
        }
        if (depth !== 0 || /[`;&]/.test(command)) return reply(state, '', `uux: ${command}: Syntax error\n`, 1);

        const uucp = new UucpSpool(new Spool(context));
        const words = command.split(/\s+/);
        const bang = words[0].indexOf('!');
        const system = bang < 0 ? uucp.localSystem : words[0].substring(0, bang) || uucp.localSystem;
        words[0] = words[0].substring(bang + 1);
        if (!words[0]) return reply(state, '', `uux: ${command}: No command given\n`, 1);
        for (const w of [system, ...words.filter(w => w.includes('!')).map(w => w.substring(0, w.indexOf('!')).replace(/^>/, ''))]) {
            if (w && !uucp.known(w)) return reply(state, '', `uux: ${w}: System not found\n`, 1);
        }
        const input = flags.has('p') ? getStdinAsString(context) ?? '' : '';
        const id = uucp.newJobId(system, grade);
        const out = flags.has('j') ? id + '\n' : '';
        const cmdline = words.join(' ');

        if (system !== uucp.localSystem) {
            uucp.queue({ id, system, kind: 'execute', source: cmdline, dest: '', bytes: input.length }, flags.has('p') ? input : undefined);
            return reply(state, out, '', 0);
        }
        // Local execution (uuxqt): file arguments name local files.
        const local = cmdline.replace(/(^|\s|>)!?(?:[A-Za-z0-9._-]+)?!(\S+)/g, (_m, pre, file) => `${pre}${file}`);
        const redirected = /(^|\s)>/.test(local);
        const status = context.spawn
            ? await context.spawn(['sh', '-c', redirected ? `${local} 2>/dev/null` : `${local} >/dev/null 2>&1`], { stdin: input })
            : 127;
        if (status !== 0 && !flags.has('n')) {
            uucp.notify(`uucp ${id} failed`, `Execution request failed:\n\t${cmdline}\nexited with status ${status}\n`);
        } else if (status === 0 && flags.has('z')) {
            uucp.notify(`uucp ${id} succeeded`, `Execution request succeeded:\n\t${cmdline}\n`);
        }
        return reply(state, out, '', 0);
    }
}
