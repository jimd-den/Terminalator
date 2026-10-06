/** comm - select or reject lines common to two files (POSIX): `comm [-123] file1 file2` */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { getopt, readInput } from '../shared/InputFiles';

export class CommCommand extends Utility {
    readonly utility = 'comm';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, '123');
        if (error) return this.usage(state, error);
        if (operands.length !== 2) return this.usage(state, operands.length < 2 ? 'missing operand' : `extra operand '${operands[2]}'`);
        const r1 = readInput(context, operands[0]);
        const r2 = readInput(context, operands[1]);
        if (!r1.ok) return this.respond(state, '', [r1.error]);
        if (!r2.ok) return this.respond(state, '', [r2.error]);
        const lines = (d: string) => { const l = d.split('\n'); if (l[l.length - 1] === '') l.pop(); return l; };
        const a = lines(r1.data), b = lines(r2.data);
        const show = [!opts.has('1'), !opts.has('2'), !opts.has('3')];
        const indent = (col: number) => '\t'.repeat(show.slice(0, col).filter(Boolean).length);
        let out = '';
        let i = 0, j = 0;
        while (i < a.length || j < b.length) {
            if (j >= b.length || (i < a.length && a[i] < b[j])) { if (show[0]) out += a[i] + '\n'; i++; }
            else if (i >= a.length || b[j] < a[i]) { if (show[1]) out += indent(1) + b[j] + '\n'; j++; }
            else { if (show[2]) out += indent(2) + a[i] + '\n'; i++; j++; }
        }
        return this.respond(state, out);
    }
}
