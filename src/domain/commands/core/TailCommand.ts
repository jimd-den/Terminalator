/**
 * tail - copy the last part of files (POSIX).
 * -n [+]N lines (default 10), -c [+]N bytes; "+N" counts from the start.
 * -f is accepted; the simulation has no growing files to follow.
 */
import { CommandResponse } from '../ICommand';
import { IStructuredCommand, CommandCapability } from '../IStructuredCommand';
import { defaultBuildArgs } from '../CommandBase';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { getopt, normalizeObsoleteCount, readInput, splitLinesKeep } from '../shared/InputFiles';

export class TailCommand implements IStructuredCommand {
    readonly capabilities = [CommandCapability.READ, CommandCapability.FILTER];
    readonly utility = 'tail';

    constructor(private fs?: FileSystemService) { }

    buildArgs(requirements: Record<string, any>): string[] {
        return defaultBuildArgs(requirements);
    }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(normalizeObsoleteCount(args), 'n:c:fqvF');
        if (error) return { output: '', stderr: `tail: ${error}\n`, exitCode: 1, newState: state };

        const bytes = opts.has('c');
        const raw = String(opts.get(bytes ? 'c' : 'n') ?? '10');
        const m = /^([-+]?)([0-9]+)$/.exec(raw);
        if (!m) return { output: '', stderr: `tail: invalid number of ${bytes ? 'bytes' : 'lines'}: '${raw}'\n`, exitCode: 1, newState: state };
        const fromStart = m[1] === '+';
        const count = parseInt(m[2], 10);

        const files = operands.length ? operands : ['-'];
        const headers = (files.length > 1 || opts.has('v')) && !opts.has('q');
        let output = '';
        const errors: string[] = [];
        files.forEach((f, idx) => {
            const input = readInput(context, f);
            if (!input.ok) { errors.push(`tail: cannot open '${f}' for reading: ${input.error.split(': ').pop()}`); return; }
            if (headers) output += `${idx > 0 ? '\n' : ''}==> ${f === '-' ? 'standard input' : f} <==\n`;
            if (bytes) {
                output += fromStart ? input.data.substring(Math.max(0, count - 1)) : (count === 0 ? '' : input.data.slice(-count));
            } else {
                const lines = splitLinesKeep(input.data);
                output += (fromStart ? lines.slice(Math.max(0, count - 1)) : (count === 0 ? [] : lines.slice(-count))).join('');
            }
        });
        return {
            output,
            stderr: errors.length ? errors.join('\n') + '\n' : undefined,
            exitCode: errors.length ? 1 : 0,
            newState: state,
        };
    }
}
