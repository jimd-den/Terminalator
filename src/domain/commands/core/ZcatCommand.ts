/**
 * ZcatCommand - Core Command
 *
 * Expand and concatenate data.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Cat compressed files.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

export class ZcatCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const files = args.filter(a => !a.startsWith('-'));
        if (files.length === 0) {
            return { output: 'zcat: missing operand', newState: state, exitCode: 1 };
        }

        let output = '';

        for (const file of files) {
            try {
                const content = this.fs.readFile(file, state.currentDirectory);
                // readFile now returns string automatically (decodes if binary)

                if (content.startsWith('RLE:')) {
                    output += this.rleDecode(content.substring(4));
                } else {
                    // zcat: usually complains if not compressed, or cat it?
                    // "Write the uncompressed form ... to standard output"
                    // If not compressed, maybe write as is?
                    // gzip zcat warns "not in gzip format" and writes original.
                    output += content;
                }
            } catch (e) {
                return { output: `zcat: ${file}: No such file or directory`, newState: state, exitCode: 1 };
            }
        }

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }



    private rleDecode(input: string): string {
        let decoded = '';
        let i = 0;
        while (i < input.length) {
            let j = i;
            while (j < input.length && /\d/.test(input[j])) {
                j++;
            }
            if (j > i) {
                const count = parseInt(input.slice(i, j), 10);
                const char = input[j];
                if (char) {
                    decoded += char.repeat(count);
                    i = j + 1;
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        return decoded;
    }
}
