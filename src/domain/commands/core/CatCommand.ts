/**
 * CatCommand - Core Command
 *
 * Concatenates and prints files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to view file contents.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class CatCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const files: string[] = [];

        // Manual arg parsing to handle '-' mixed with files
        for (const arg of args) {
            if (arg.startsWith('-') && arg !== '-') {
                // Ignore flags for now (e.g. -u)
            } else {
                files.push(arg);
            }
        }

        let output = '';

        if (files.length === 0) {
            if (input !== undefined) {
                output = input;
            } else {
                return { output: 'cat: missing input', newState: state, exitCode: 1 };
            }
        } else {
            for (const filename of files) {
                if (filename === '-') {
                    output += input || '';
                    continue;
                }

                let path = filename;
                if (!path.startsWith('/')) {
                    path = state.currentDirectory === '/'
                        ? `/${filename}`
                        : `${state.currentDirectory}/${filename}`;
                }

                try {
                    const node = this.fs.resolveNode(path);
                    const inode = node ? this.fs.getInode(node.inodeId) : undefined;
                    if (node && inode && (inode.mode & 0o040000)) { // S_IFDIR
                        return { output: `cat: ${filename}: Is a directory`, newState: state, exitCode: 1 };
                    }
                    const content = this.fs.readFile(path);
                    output += content;
                } catch (error: any) {
                    return {
                        output: `cat: ${filename}: No such file or directory`,
                        newState: state,
                        exitCode: 1
                    };
                }
            }
        }

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }
}
