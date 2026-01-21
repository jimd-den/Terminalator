/**
 * SplitCommand - Core Command
 *
 * Split a file into pieces.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Break files into chunks.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class SplitCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
        // split [-l line_count] [-a suffix_length] [file [prefix]]
        let lineCount = 1000;
        let suffixLength = 2;
        const operands: string[] = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === '-l') {
                lineCount = parseInt(args[++i], 10) || 1000;
            } else if (arg === '-a') {
                suffixLength = parseInt(args[++i], 10) || 2;
            } else if (!arg.startsWith('-')) {
                operands.push(arg);
            }
        }

        let content = '';
        let prefix = 'x'; // POSIX default prefix is 'x'

        if (operands.length > 0) {
            const file = operands[0];
            if (file === '-') {
                content = input || '';
            } else {
                try {
                    content = this.fs.readFile(this.resolvePath(file, state));
                } catch (e) {
                    return { output: `split: ${file}: No such file`, newState: state, exitCode: 1 };
                }
            }
            if (operands.length > 1) {
                prefix = operands[1];
            }
        } else {
            content = input || '';
        }

        const lines = content.split('\n');
        // Handle trailing newline behavior: if file ends in newline, last split element is empty.
        // split usually preserves content exactly. "a\n" is 1 line. "a" is 1 line.
        // We'll stick to simple line splitting for chunks.
        if (content.endsWith('\n') && lines[lines.length - 1] === '') lines.pop();

        let chunkIndex = 0;
        for (let i = 0; i < lines.length; i += lineCount) {
            const chunk = lines.slice(i, i + lineCount);
            // Reconstruct content
            // Be careful: if original had newlines, we add them back.
            // Split output files usually end with newline unless original didn't?
            // "The split utility shall read an input file ... and write ... fixed-size pieces"
            // We'll assume standard text files.
            const chunkContent = chunk.join('\n') + '\n';

            // Generate filename: prefix + suffix (aa, ab, ..., zy, zz)
            const suffix = this.generateSuffix(chunkIndex, suffixLength);
            const filename = prefix + suffix;

            // Write to CWD
            const path = state.currentDirectory === '/' ? `/${filename}` : `${state.currentDirectory}/${filename}`;
            try {
                this.fs.writeFile(path, chunkContent, 'w');
            } catch (e) {
                return { output: `split: cannot write ${filename}`, newState: state, exitCode: 1 };
            }
            chunkIndex++;
        }

        return {
            output: '', // No output on success
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }

    private generateSuffix(index: number, length: number): string {
        // Base 26: a-z
        let suffix = '';
        let temp = index;
        for (let i = 0; i < length; i++) {
            const charCode = 97 + (temp % 26); // 'a' is 97
            suffix = String.fromCharCode(charCode) + suffix;
            temp = Math.floor(temp / 26);
        }
        // This generates "ba" for index 1? No.
        // Standard is aa, ab, ac...
        // My logic: index 0 -> aa. index 1 -> ab.
        // With i loop 0..length-1:
        // suffix added at start?
        // Wait. "aa", "ab"
        // rightmost char changes fastest.
        // Logic:
        // char at pos p (from right, 0-indexed) is (index / 26^p) % 26

        let res = '';
        for (let i = 0; i < length; i++) {
            const val = Math.floor(index / Math.pow(26, length - 1 - i)) % 26;
            res += String.fromCharCode(97 + val);
        }
        return res;
    }
}
