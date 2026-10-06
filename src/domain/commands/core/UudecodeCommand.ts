/**
 * uudecode - decode a uuencoded or base64 (begin-base64) file (POSIX):
 * `uudecode [-o outfile] [file]`. Writes the file named in the header.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { getopt, readInput } from '../shared/InputFiles';
import { base64Decode } from '../../utils/Base64';
import { bytesToBinaryString } from '../../services/shell/io/OutputSink';
import { strerror } from '../shared/PathOps';

export class UudecodeCommand extends Utility {
    readonly utility = 'uudecode';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { opts, operands, error } = getopt(args, 'o:m');
        if (error) return this.usage(state, error);
        const name = operands[0] ?? '-';
        const input = readInput(context, name);
        if (!input.ok) return this.respond(state, '', [input.error]);
        const lines = input.data.split('\n');
        const start = lines.findIndex(l => /^begin(-base64)? [0-7]+ /.test(l));
        if (start < 0) return this.respond(state, '', [`${name}: No \`begin' line`]);
        const header = /^begin(-base64)? ([0-7]+) (.*)$/.exec(lines[start])!;
        const isBase64 = !!header[1];
        const bytes: number[] = [];

        if (isBase64) {
            const body: string[] = [];
            for (let k = start + 1; k < lines.length && lines[k] !== '===='; k++) body.push(lines[k]);
            try { bytes.push(...base64Decode(body.join(''))); } catch { return this.respond(state, '', [`${name}: invalid input`]); }
        } else {
            let ended = false;
            for (let k = start + 1; k < lines.length; k++) {
                const l = lines[k];
                if (l === 'end') { ended = true; break; }
                if (l === '' || l === '`') continue;
                const n = (l.charCodeAt(0) - 32) & 0x3f;
                const dec = (i: number) => ((l.charCodeAt(i) || 32) - 32) & 0x3f;
                const chunk: number[] = [];
                for (let i = 1; chunk.length < n; i += 4) {
                    const a = dec(i), b = dec(i + 1), c = dec(i + 2), d = dec(i + 3);
                    chunk.push(((a << 2) | (b >> 4)) & 0xff, ((b << 4) | (c >> 2)) & 0xff, ((c << 6) | d) & 0xff);
                }
                bytes.push(...chunk.slice(0, n));
            }
            if (!ended) return this.respond(state, '', [`${name}: No \`end' line`]);
        }

        const target = String(opts.get('o') ?? header[3]);
        const data = Uint8Array.from(bytes);
        if (target === '/dev/stdout' || target === '-') return this.respond(state, bytesToBinaryString(data), [], 0, true);
        try {
            const fs = context.fileSystemService;
            const abs = fs.resolveAbsolutePath(target, context.cwd);
            fs.writeFile(abs, data, 'w', undefined, undefined, '/');
            fs.chmod(abs, parseInt(header[2], 8) & 0o777, '/');
        } catch (e) {
            return this.respond(state, '', [`${target}: ${strerror(e)}`]);
        }
        return this.respond(state, '');
    }
}
