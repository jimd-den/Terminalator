/**
 * compress - compress data (POSIX XSI). LZW .Z format, compatible with
 * ncompress/gzip.
 *
 *   compress [-fv] [-b bits] [file...]
 *   compress [-cfv] [-b bits] [file]
 *
 * A file is only replaced by file.Z when that saves space, unless -f is
 * given. Exit status: 0 success, 1 error, 2 a file was left uncompressed.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { getopt, readInputBytes } from '../shared/InputFiles';
import { statPath } from '../shared/FileInfo';
import { exists, replaceFile } from '../shared/Compression';
import { lzwCompress } from '../../utils/Lzw';
import { bytesToBinaryString } from '../../services/shell/io/OutputSink';
import { DirectoryNode } from '../../entities/filesystem/DirectoryNode';

export class CompressCommand implements ICommand {
    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'cfvb:rV');
        const err: string[] = [];
        if (error) return { output: '', stderr: `compress: ${error}\n`, exitCode: 1, newState: state };
        const bits = opts.has('b') ? Number(opts.get('b')) : 16;
        if (!Number.isInteger(bits) || bits < 9 || bits > 16) {
            return { output: '', stderr: `compress: -b ${opts.get('b')}: bits must be 9..16\n`, exitCode: 1, newState: state };
        }
        const toStdout = opts.has('c') || operands.length === 0;
        const force = opts.has('f');
        const verbose = opts.has('v');
        let status = 0;
        let output = '';

        const files = opts.has('r') ? this.expandRecursive(context, operands) : operands;
        for (const file of files.length ? files : ['-']) {
            if (file !== '-' && file.endsWith('.Z') && !toStdout) {
                err.push(`compress: ${file}: already has .Z suffix -- no change`);
                status = Math.max(status, 1);
                continue;
            }
            const input = readInputBytes(context, file);
            if (!input.ok) { err.push(`compress: ${input.error}`); status = 1; continue; }
            const packed = lzwCompress(input.data, bits);
            const saved = input.data.length ? (1 - packed.length / input.data.length) * 100 : 0;

            if (toStdout) {
                output += bytesToBinaryString(packed);
                if (verbose && file !== '-') err.push(`${file}: Compression: ${saved.toFixed(2)}%`);
                continue;
            }
            if (packed.length >= input.data.length && !force) {
                if (verbose) err.push(`${file}: No compression -- ${file} unchanged`);
                status = Math.max(status, 2);
                continue;
            }
            if (exists(context, file + '.Z') && !force) {
                err.push(`compress: ${file}.Z already exists.`);
                status = 1;
                continue;
            }
            try {
                replaceFile(context, file, file + '.Z', packed);
                if (verbose) err.push(`${file}: Compression: ${saved.toFixed(2)}% -- replaced with ${file}.Z`);
            } catch (e: any) {
                err.push(`compress: ${file}: ${e.message}`);
                status = 1;
            }
        }
        return { output, binary: true, stderr: err.length ? err.join('\n') + '\n' : undefined, exitCode: status, newState: state };
    }

    private expandRecursive(context: ProcessContext, operands: string[]): string[] {
        const out: string[] = [];
        const walk = (path: string) => {
            const info = statPath(context, path);
            if (info?.kind !== 'directory') { out.push(path); return; }
            const node = context.fileSystemService.resolve(info.path, '/');
            if (node instanceof DirectoryNode) for (const name of node.children.keys()) walk(`${path}/${name}`);
        };
        operands.forEach(walk);
        return out;
    }
}
