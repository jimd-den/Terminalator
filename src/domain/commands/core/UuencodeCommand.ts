/**
 * uuencode - encode a binary file (POSIX): `uuencode [-m] [file] decode_pathname`.
 * Historical encoding by default, base64 with -m.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { readInputBytes } from '../shared/InputFiles';
import { statPath } from '../shared/FileInfo';
import { base64Encode } from '../../utils/Base64';

const enc = (n: number) => String.fromCharCode(n === 0 ? 96 : (n & 0x3f) + 32);

export function uuencodeLines(data: Uint8Array): string {
    let out = '';
    for (let i = 0; i < data.length; i += 45) {
        const chunk = data.subarray(i, i + 45);
        let line = enc(chunk.length);
        for (let k = 0; k < chunk.length; k += 3) {
            const a = chunk[k], b = chunk[k + 1] ?? 0, c = chunk[k + 2] ?? 0;
            line += enc(a >> 2) + enc(((a << 4) | (b >> 4)) & 0x3f) + enc(((b << 2) | (c >> 6)) & 0x3f) + enc(c & 0x3f);
        }
        out += line + '\n';
    }
    return out + '`\n';
}

export class UuencodeCommand extends Utility {
    readonly utility = 'uuencode';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const base64 = args[0] === '-m';
        const operands = (base64 ? args.slice(1) : args).filter((a, i, all) => !(a === '--' && i === 0));
        if (operands.length < 1) return this.usage(state, 'missing operand');
        if (operands.length > 2) return this.usage(state, `extra operand '${operands[2]}'`);
        const [file, name] = operands.length === 2 ? operands : ['-', operands[0]];
        const input = readInputBytes(context, file);
        if (!input.ok) return this.respond(state, '', [input.error]);
        const info = file !== '-' ? statPath(context, file) : null;
        const mode = ((info?.inode.mode ?? 0o666 & ~0o022) & 0o777).toString(8);
        if (base64) {
            const b64 = base64Encode(input.data).replace(/(.{60})/g, '$1\n').replace(/\n$/, '');
            return this.respond(state, `begin-base64 ${mode} ${name}\n${b64 ? b64 + '\n' : ''}====\n`);
        }
        return this.respond(state, `begin ${mode} ${name}\n${uuencodeLines(input.data)}end\n`);
    }
}
