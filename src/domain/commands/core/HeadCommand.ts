/**
 * head - copy the first part of files (POSIX): -n lines (default 10), -c bytes.
 */
import { CommandResponse } from '../ICommand';
import { IStructuredCommand, CommandCapability } from '../IStructuredCommand';
import { defaultBuildArgs } from '../CommandBase';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { getopt, normalizeObsoleteCount, readInput, splitLinesKeep } from '../shared/InputFiles';

export class HeadCommand implements IStructuredCommand {
    readonly capabilities = [CommandCapability.READ, CommandCapability.FILTER];
    readonly utility = 'head';

    constructor(private fs?: FileSystemService) { }

    buildArgs(requirements: Record<string, any>): string[] {
        return defaultBuildArgs(requirements);
    }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(normalizeObsoleteCount(args), 'n:c:qv');
        if (error) return { output: '', stderr: `head: ${error}\n`, exitCode: 1, newState: state };

        const bytes = opts.has('c');
        const raw = String(opts.get(bytes ? 'c' : 'n') ?? '10');
        if (!/^-?[0-9]+$/.test(raw)) return { output: '', stderr: `head: invalid number of ${bytes ? 'bytes' : 'lines'}: '${raw}'\n`, exitCode: 1, newState: state };
        const count = parseInt(raw, 10);

        const files = operands.length ? operands : ['-'];
        const headers = (files.length > 1 || opts.has('v')) && !opts.has('q');
        let output = '';
        const errors: string[] = [];
        files.forEach((f, idx) => {
            const input = readInput(context, f);
            if (!input.ok) { errors.push(`head: cannot open '${f}' for reading: ${input.error.split(': ').pop()}`); return; }
            if (headers) output += `${idx > 0 ? '\n' : ''}==> ${f === '-' ? 'standard input' : f} <==\n`;
            if (bytes) {
                output += count >= 0 ? input.data.substring(0, count) : input.data.substring(0, Math.max(0, input.data.length + count));
            } else {
                const lines = splitLinesKeep(input.data);
                output += (count >= 0 ? lines.slice(0, count) : lines.slice(0, Math.max(0, lines.length + count))).join('');
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
