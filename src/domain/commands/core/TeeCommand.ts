import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * TeeCommand - Core Command
 *
 * Duplicate standard input.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Read from standard input and write to standard output and files.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

export class TeeCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        const files: string[] = [];
        let append = false;

        for (const arg of args) {
            if (arg === '-a') {
                append = true;
            } else if (!arg.startsWith('-')) {
                files.push(arg);
            }
        }

        const content = input || '';
        let exitCode = 0;

        // Write to files
        for (const file of files) {
            try {
                const path = this.resolvePath(file, state);

                // Check parent dir
                const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
                const parent = this.fs.resolve(parentPath);
                if (!parent || !this.fs.isDirectory(parent)) {
                    throw new Error('No such directory');
                }

                if (append) {
                    let existing = '';
                    try {
                        existing = this.fs.readFile(path);
                    } catch (e) {
                        // ignore if missing
                    }
                    this.fs.writeFile(path, existing + content, 'w');
                } else {
                    this.fs.writeFile(path, content, 'w');
                }
            } catch (e) {
                // tee writes diagnostic and continues
                exitCode = 1;
            }
        }

        return {
            output: content,
            newState: state,
            exitCode: exitCode
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
