/**
 * UncompressCommand - Core Command
 *
 * Expand data.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Restore compressed file.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class UncompressCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const files = args.filter(a => !a.startsWith('-'));
        if (files.length === 0) {
             return { output: 'uncompress: missing operand', newState: state, exitCode: 1 };
        }

        for (const file of files) {
            try {
                const path = this.resolvePath(file, state);
                const content = this.fs.readFile(path);

                if (!content.startsWith('RLE:')) {
                    return { output: `uncompress: ${file}: not in compressed format`, newState: state, exitCode: 1 };
                }

                const decoded = this.rleDecode(content.substring(4));

                let newPath = path;
                if (path.endsWith('.Z')) {
                    newPath = path.slice(0, -2);
                } else {
                    // uncompress usually expects .Z or refuses?
                    // "If ... does not end in .Z, uncompress shall ... fail"
                    // Relaxed for simulation? Or strict?
                    // Strict.
                    return { output: `uncompress: ${file}: unknown suffix -- ignored`, newState: state, exitCode: 1 };
                }

                this.fs.writeFile(newPath, decoded, 'w');
                this.fs.deleteNode(path);
            } catch (e) {
                return { output: `uncompress: ${file}: No such file or directory`, newState: state, exitCode: 1 };
            }
        }

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }

    private rleDecode(input: string): string {
        let decoded = '';
        let i = 0;
        while (i < input.length) {
            // Read count (digits)
            let j = i;
            while (j < input.length && /\d/.test(input[j])) {
                j++;
            }
            if (j > i) {
                const count = parseInt(input.slice(i, j), 10);
                const char = input[j]; // next char
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
