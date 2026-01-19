/**
 * UnlinkCommand - Core Command
 *
 * Call the unlink function to remove the specified file.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Remove a directory entry.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class UnlinkCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const files = args.filter(a => !a.startsWith('-'));
        if (files.length === 0) {
             return { output: 'unlink: missing operand', newState: state, exitCode: 1 };
        }

        const file = files[0]; // unlink takes exactly one argument usually? POSIX says "file". Singular.

        try {
            const path = this.resolvePath(file, state);
            const node = this.fs.resolveNode(path);
            if (!node) {
                return { output: `unlink: cannot unlink '${file}': No such file or directory`, newState: state, exitCode: 1 };
            }

            // Check if directory
            const inode = this.fs.getInode(node.inodeId);
            if (inode.mode & 0o040000) {
                return { output: `unlink: cannot unlink '${file}': Is a directory`, newState: state, exitCode: 1 };
            }

            this.fs.deleteNode(path);

        } catch (e: any) {
            return { output: `unlink: cannot unlink '${file}': ${e.message}`, newState: state, exitCode: 1 };
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
}
