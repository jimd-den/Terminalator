/**
 * uncompress - expand compressed data (POSIX XSI): `uncompress [-cfv] [file...]`.
 * Operands may be given with or without the .Z suffix.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { getopt, readInputBytes } from '../shared/InputFiles';
import { exists, replaceFile } from '../shared/Compression';
import { isCompressed, lzwDecompress } from '../../utils/Lzw';
import { bytesToBinaryString } from '../../services/shell/io/OutputSink';

export function expandFile(context: ProcessContext, operand: string, name: string):
    { ok: true; data: Uint8Array; source: string } | { ok: false; error: string } {
    const candidates = operand === '-' ? ['-'] : operand.endsWith('.Z') ? [operand] : [operand + '.Z', operand];
    const source = candidates.find(c => c === '-' || exists(context, c)) ?? candidates[0];
    const input = readInputBytes(context, source);
    if (!input.ok) return { ok: false, error: `${name}: ${input.error}` };
    if (!isCompressed(input.data)) return { ok: false, error: `${name}: ${source}: not in compressed format` };
    try {
        return { ok: true, data: lzwDecompress(input.data), source };
    } catch (e: any) {
        return { ok: false, error: `${name}: ${source}: ${e.message}` };
    }
}

export class UncompressCommand implements ICommand {
    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'cfvV');
        if (error) return { output: '', stderr: `uncompress: ${error}\n`, exitCode: 1, newState: state };
        const toStdout = opts.has('c') || operands.length === 0;
        const err: string[] = [];
        let output = '';
        let status = 0;

        for (const operand of operands.length ? operands : ['-']) {
            const res = expandFile(context, operand, 'uncompress');
            if (!res.ok) { err.push(res.error); status = 1; continue; }
            if (toStdout) { output += bytesToBinaryString(res.data); continue; }
            const target = res.source.replace(/\.Z$/, '');
            if (target === res.source) { err.push(`uncompress: ${res.source}: unknown suffix -- ignored`); status = 1; continue; }
            if (exists(context, target) && !opts.has('f')) { err.push(`uncompress: ${target} already exists.`); status = 1; continue; }
            if (exists(context, target)) context.fileSystemService.deleteNode(context.fileSystemService.resolveAbsolutePath(target, context.cwd), '/');
            replaceFile(context, res.source, target, res.data);
            if (opts.has('v')) err.push(`${res.source}: -- replaced with ${target}`);
        }
        return { output, binary: true, stderr: err.length ? err.join('\n') + '\n' : undefined, exitCode: status, newState: state };
    }
}
