import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * FoldCommand - Core Command
 *
 * Wrap each input line to fit in specified width.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Break long lines for display.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

export class FoldCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        let width = 80;
        let files: string[] = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === '-w') {
                width = parseInt(args[++i], 10) || 80;
            } else if (!arg.startsWith('-')) {
                files.push(arg);
            }
        }

        let content = '';

        if (files.length > 0) {
            for (const file of files) {
                try {
                    const path = this.resolvePath(file, state);
                    content += this.fs.readFile(path);
                    // Add newline between files? standard fold catenates?
                    // Usually tools operate sequentially.
                    // For simplicity, we concat.
                } catch (e) {
                    return { output: `fold: ${file}: No such file`, newState: state, exitCode: 1 };
                }
            }
        } else if (input) {
            content = input;
        } else {
            return { output: '', newState: state, exitCode: 0 };
        }

        const lines = content.split('\n');
        const outputLines: string[] = [];

        for (const line of lines) {
            if (line.length <= width) {
                outputLines.push(line);
            } else {
                let pos = 0;
                while (pos < line.length) {
                    outputLines.push(line.slice(pos, pos + width));
                    pos += width;
                }
            }
        }

        return {
            output: outputLines.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
