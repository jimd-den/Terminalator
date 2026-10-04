/** nice - invoke a utility with an altered nice value (POSIX): `nice [-n increment] utility [argument...]` */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';

export class NiceCommand extends Utility {
    readonly utility = 'nice';

    constructor(private fs?: FileSystemService) { super(); }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        let increment = 10;
        let i = 0;
        if (args[0] === '-n') { increment = Number(args[1]); i = 2; }
        else if (/^-n-?[0-9]+$/.test(args[0] ?? '')) { increment = Number(args[0].substring(2)); i = 1; }
        else if (/^-[0-9]+$/.test(args[0] ?? '')) { increment = Number(args[0].substring(1)); i = 1; }
        else if (/^--[0-9]+$/.test(args[0] ?? '')) { increment = -Number(args[0].substring(2)); i = 1; }
        else if (args[0]?.startsWith('-') && args[0] !== '--') return this.usage(state, `invalid option -- '${args[0].substring(1)}'`, 125);
        if (args[i] === '--') i++;
        if (!Number.isInteger(increment)) return this.usage(state, `invalid adjustment '${args[1]}'`, 125);
        const argv = args.slice(i);
        const current = state.niceIncrement ?? 0;
        if (!argv.length) return this.respond(state, `${current}\n`);
        const errors: string[] = [];
        if (increment < 0 && context.user.uid !== 0) {
            errors.push('cannot set niceness: Permission denied');
            increment = 0;
        }
        const status = await context.spawn!(argv, { nice: increment });
        return this.respond(state, '', errors, status);
    }
}
