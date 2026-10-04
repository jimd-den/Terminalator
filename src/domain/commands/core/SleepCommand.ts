/**
 * sleep - suspend execution for an interval (POSIX): `sleep time`, where
 * GNU also accepts fractions, s/m/h/d suffixes and several operands.
 * The simulation caps a single sleep so the terminal stays responsive.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';

const MAX_SLEEP_MS = 10_000;

export class SleepCommand extends Utility {
    readonly utility = 'sleep';

    constructor(private fs?: FileSystemService) { super(); }

    async execute(args: string[], _context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const operands = args[0] === '--' ? args.slice(1) : args;
        if (!operands.length) return this.usage(state, 'missing operand');
        let total = 0;
        for (const op of operands) {
            const m = /^([0-9]*\.?[0-9]+|[0-9]+\.)([smhd]?)$/.exec(op);
            if (!m) return this.usage(state, `invalid time interval '${op}'`);
            total += parseFloat(m[1]) * ({ '': 1, s: 1, m: 60, h: 3600, d: 86400 } as Record<string, number>)[m[2]];
        }
        const ms = Math.min(total * 1000, MAX_SLEEP_MS);
        if (ms > 0) await new Promise(resolve => setTimeout(resolve, ms));
        return this.respond(state, '');
    }
}
