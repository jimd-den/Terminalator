/**
 * zcat - expand and concatenate compressed data (POSIX XSI): `zcat [file...]`.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { expandFile } from './UncompressCommand';
import { bytesToBinaryString } from '../../services/shell/io/OutputSink';

export class ZcatCommand implements ICommand {
    constructor(private fs?: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const operands = args[0] === '--' ? args.slice(1) : args;
        const err: string[] = [];
        let output = '';
        for (const operand of operands.length ? operands : ['-']) {
            const res = expandFile(context, operand, 'zcat');
            if (!res.ok) { err.push(res.error); continue; }
            output += bytesToBinaryString(res.data);
        }
        return { output, binary: true, stderr: err.length ? err.join('\n') + '\n' : undefined, exitCode: err.length ? 1 : 0, newState: state };
    }
}
