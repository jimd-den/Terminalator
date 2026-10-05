/**
 * lp - send files to a printer (POSIX lp).
 *
 *   lp [-c] [-d dest] [-n copies] [-msw] [-o option]... [-q priority] [-t title] [file...]
 *
 * Queues one request holding all the files (standard input when there are
 * none, or for the operand -) on the destination (-d, else $LPDEST,
 * $PRINTER or the system default; see PrintSpool) and writes
 * "request id is <dest>-<n> (<k> file(s))" unless -s. Diagnostics follow
 * CUPS ("lp: Error - ...").
 */
import { Utility } from '../shared/Utility';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { getopt, readInput } from '../shared/InputFiles';
import { Spool, reply } from '../shared/Spool';
import { PrintSpool } from '../shared/PrintSpool';

export class LpCommand extends Utility {
    readonly utility = 'lp';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'cd:n:mswo:q:t:EH:P:h:i:');
        const fail = (msg: string) => reply(state, '', `lp: ${msg}\n`, 1);
        if (error) return fail(`Error - ${error}`);
        const queue = new PrintSpool(new Spool(context));

        const dest = (opts.get('d') as string | undefined) ?? queue.defaultDest(context.env);
        if (!dest) return fail('Error - no default destination available.');
        if (!queue.printer(dest)) return fail('The printer or class does not exist.');

        let copies = 1;
        if (opts.has('n')) {
            copies = /^\d+$/.test(opts.get('n') as string) ? parseInt(opts.get('n') as string, 10) : 0;
            if (copies < 1) return fail('Error - copies must be 1 or more.');
        }
        let priority = 50;
        if (opts.has('q')) {
            priority = /^\d+$/.test(opts.get('q') as string) ? parseInt(opts.get('q') as string, 10) : 0;
            if (priority < 1 || priority > 100) return fail('Error - priority must be between 1 and 100.');
        }

        const docs: string[] = [];
        for (const op of operands.length ? operands : ['-']) {
            const input = readInput(context, op);
            if (!input.ok) {
                const reason = input.error.substring(input.error.indexOf(': ') + 2);
                return fail(`Error - unable to access "${op}" - ${reason}`);
            }
            if (op === '-' && input.data === '') return fail('Error - stdin is empty, so no job has been sent.');
            docs.push(input.data);
        }
        const title = (opts.get('t') as string | undefined) ?? (operands[0] && operands[0] !== '-' ? operands[0].split('/').pop()! : '(stdin)');
        const id = queue.submit(dest, title, copies, priority, docs, new Date());
        const out = opts.has('s') ? '' : `request id is ${dest}-${id} (${docs.length} file(s))\n`;
        return reply(state, out, '', 0);
    }
}
