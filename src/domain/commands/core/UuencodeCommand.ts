import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * UuencodeCommand - Core Command
 *
 * Encode a binary file.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Binary to text encoding.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystem } from '../../entities/FileSystem';

export class UuencodeCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        // uuencode [file] decode_pathname
        let infile = '';
        let decodePath = '';

        if (args.length === 1) {
            decodePath = args[0];
        } else if (args.length === 2) {
            infile = args[0];
            decodePath = args[1];
        } else {
            return { output: 'uuencode: missing operand', newState: state, exitCode: 1 };
        }

        let content = '';
        if (infile) {
            try {
                const raw = this.fs.readFile(this.resolvePath(infile, state));
                content = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
            } catch (e) {
                return { output: `uuencode: ${infile}: No such file`, newState: state, exitCode: 1 };
            }
        } else if (input) {
            content = input;
        } else {
            return { output: '', newState: state, exitCode: 0 };
        }

        const mode = '644'; // Default
        let output = `begin ${mode} ${decodePath}\n`;

        // Encoding logic (simplified uuencode)
        // 45 input bytes -> 60 output chars.
        // Each line starts with length char.
        // Space (32) is 0. '!' (33) is 1.

        for (let i = 0; i < content.length; i += 45) {
            const chunk = content.slice(i, i + 45);
            const lenChar = String.fromCharCode(32 + chunk.length);
            output += lenChar;

            for (let j = 0; j < chunk.length; j += 3) {
                const b1 = chunk.charCodeAt(j);
                const b2 = j + 1 < chunk.length ? chunk.charCodeAt(j + 1) : 0;
                const b3 = j + 2 < chunk.length ? chunk.charCodeAt(j + 2) : 0;

                const val = (b1 << 16) | (b2 << 8) | b3;

                const c1 = (val >> 18) & 0x3F;
                const c2 = (val >> 12) & 0x3F;
                const c3 = (val >> 6) & 0x3F;
                const c4 = val & 0x3F;

                output += String.fromCharCode(32 + (c1 || 0)); // Handle 0 -> space or `? 0 is space.
                output += String.fromCharCode(32 + (c2 || 0));
                output += String.fromCharCode(32 + (c3 || 0));
                output += String.fromCharCode(32 + (c4 || 0));
            }
            output += '\n';
        }

        output += '`\nend'; // '`' is length 0 (space is 0, but backtick is often used for 0 length line end marker?)
        // Usually ends with line length 0 char.
        // space is 0 (32). ` is 96?
        // Standard uuencode uses space for 0. But often ` is used for end block.
        // `man uuencode`: "The end of the file is indicated by a line consisting only of a single space (or backtick) character..."

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
