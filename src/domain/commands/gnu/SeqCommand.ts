/**
 * seq - print a sequence of numbers (GNU coreutils):
 * `seq [-f format] [-s sep] [-w] [first [incr]] last`
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { PrintfCommand } from '../core/PrintfCommand';

const NUM = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

export class SeqCommand extends Utility {
    readonly utility = 'seq';
    private printf = new PrintfCommand();

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        let format: string | undefined;
        let sep = '\n';
        let equalWidth = false;
        const nums: string[] = [];
        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            if (a === '-f') { format = args[++i]; continue; }
            if (a.startsWith('-f') && a.length > 2) { format = a.substring(2); continue; }
            if (a === '-s') { sep = args[++i] ?? ''; continue; }
            if (a.startsWith('-s') && a.length > 2) { sep = a.substring(2); continue; }
            if (a === '-w') { equalWidth = true; continue; }
            if (a === '--') continue;
            if (a.startsWith('-') && !NUM.test(a)) return this.usage(state, `invalid option -- '${a.substring(1)}'`);
            nums.push(a);
        }
        if (nums.length < 1 || nums.length > 3) return this.usage(state, nums.length ? `extra operand '${nums[3]}'` : 'missing operand');
        for (const n of nums) if (!NUM.test(n)) return this.usage(state, `invalid floating point argument: '${n}'`);
        const [first, incr, last] = nums.length === 1 ? ['1', '1', nums[0]] : nums.length === 2 ? [nums[0], '1', nums[1]] : nums;
        const step = Number(incr);
        if (step === 0) return this.usage(state, `invalid Zero increment value: '${incr}'`);

        const decimals = Math.max(...[first, incr].map(n => (n.split(/[eE]/)[0].split('.')[1] ?? '').length));
        const start = Number(first), end = Number(last);
        const values: string[] = [];
        for (let i = 0, v = start; step > 0 ? v <= end + 1e-12 : v >= end - 1e-12; i++, v = start + i * step) {
            if (values.length > 1_000_000) break;
            let text: string;
            if (format) {
                text = this.printf.execute([format, String(v)], context, state).output;
            } else {
                text = decimals ? v.toFixed(decimals) : String(Math.round(v));
            }
            values.push(text);
        }
        if (equalWidth && !format) {
            const w = Math.max(...values.map(v => v.length));
            for (let i = 0; i < values.length; i++) {
                const neg = values[i].startsWith('-');
                const digits = neg ? values[i].substring(1) : values[i];
                values[i] = (neg ? '-' : '') + digits.padStart(w - (neg ? 1 : 0), '0');
            }
        }
        return this.respond(state, values.length ? values.join(sep) + '\n' : '');
    }
}
