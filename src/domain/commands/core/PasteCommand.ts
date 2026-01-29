import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * PasteCommand - Core Command
 *
 * Merge corresponding or subsequent lines of files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Join files horizontally.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';

export class PasteCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        let delimiter = '\t';
        let serial = false;
        const files: string[] = [];

        let skipNext = false;
        for (let i = 0; i < args.length; i++) {
            if (skipNext) {
                skipNext = false;
                continue;
            }
            const arg = args[i];
            if (arg === '-d') {
                if (i + 1 < args.length) {
                    delimiter = args[i + 1];
                    delimiter = delimiter
                        .replace(/\\t/g, '\t')
                        .replace(/\\n/g, '\n')
                        .replace(/\\\\/g, '\\');
                    skipNext = true;
                }
            } else if (arg === '-s') {
                serial = true;
            } else if (!arg.startsWith('-')) {
                files.push(arg);
            }
        }

        if (files.length === 0) {
            return { output: '', newState: state, exitCode: 0 };
        }

        const fileContents: string[][] = [];
        try {
            for (const file of files) {
                if (file === '-') {
                    fileContents.push((input || '').split('\n'));
                } else {
                    const path = this.resolvePath(file, state);
                    const content = this.fs.readFile(path);
                    const lines = content.split('\n');
                    if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
                    fileContents.push(lines);
                }
            }
        } catch (e) {
            return {
                output: `paste: No such file or directory`,
                newState: state,
                exitCode: 1
            };
        }

        const output: string[] = [];
        const getDelim = (idx: number) => {
            if (delimiter.length === 0) return '';
            return delimiter[idx % delimiter.length];
        };

        if (serial) {
            for (const lines of fileContents) {
                let lineStr = '';
                for (let k = 0; k < lines.length; k++) {
                    if (k > 0) lineStr += getDelim(k - 1);
                    lineStr += lines[k];
                }
                output.push(lineStr);
            }
        } else {
            let maxLines = 0;
            for (const lines of fileContents) maxLines = Math.max(maxLines, lines.length);

            for (let i = 0; i < maxLines; i++) {
                let rowStr = '';
                for (let j = 0; j < fileContents.length; j++) {
                    const lines = fileContents[j];
                    if (j > 0) rowStr += getDelim(j - 1);
                    rowStr += (i < lines.length ? lines[i] : '');
                }
                output.push(rowStr);
            }
        }

        return {
            output: output.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
