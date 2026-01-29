import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * CmpCommand - Core Command
 *
 * Compare two files byte by byte.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Check if files are identical or where they differ.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';

export class CmpCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        // POSIX: cmp [options] file1 file2 [skip1 [skip2]]
        // Simplified: cmp file1 file2

        const files = args.filter(a => !a.startsWith('-'));
        if (files.length < 2) {
            return { output: 'cmp: missing operand', newState: state, exitCode: 2 };
        }

        const file1 = files[0];
        const file2 = files[1];

        try {
            const path1 = this.resolvePath(file1, state);
            const path2 = this.resolvePath(file2, state);

            const content1 = this.fs.readFile(path1);
            const content2 = this.fs.readFile(path2);

            // Byte by byte comparison
            const len = Math.min(content1.length, content2.length);
            for (let i = 0; i < len; i++) {
                if (content1[i] !== content2[i]) {
                    // Determine line number
                    // Count newlines up to i
                    let line = 1;
                    for (let j = 0; j < i; j++) {
                        if (content1[j] === '\n') line++;
                    }
                    return {
                        output: `${file1} ${file2} differ: byte ${i + 1}, line ${line}`,
                        newState: state,
                        exitCode: 1
                    };
                }
            }

            if (content1.length !== content2.length) {
                return {
                    output: `cmp: EOF on ${content1.length < content2.length ? file1 : file2}`,
                    newState: state,
                    exitCode: 1
                };
            }

            return {
                output: '',
                newState: state,
                exitCode: 0
            };

        } catch (e) {
            return {
                output: `cmp: No such file or directory`,
                newState: state,
                exitCode: 2
            };
        }
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
