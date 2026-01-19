/**
 * RmdirCommand - Core Command
 *
 * Remove empty directories.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Standard POSIX rmdir.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class RmdirCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const dirs = args.filter(a => !a.startsWith('-'));
        if (dirs.length === 0) {
             return { output: 'rmdir: missing operand', newState: state, exitCode: 1 };
        }

        for (const dir of dirs) {
            try {
                const path = this.resolvePath(dir, state);
                const node = this.fs.resolveNode(path);
                if (!node) {
                    return { output: `rmdir: failed to remove '${dir}': No such file or directory`, newState: state, exitCode: 1 };
                }
                const inode = this.fs.getInode(node.inodeId);
                // Check if directory
                if (!(inode.mode & 0o040000)) {
                    return { output: `rmdir: failed to remove '${dir}': Not a directory`, newState: state, exitCode: 1 };
                }
                // Check if empty (size 0 or internal check)
                // InodeTable logic usually handles "directory not empty" check in unlink/rmdir?
                // FileSystem.deleteNode might handle it.
                // Or we check children.
                // Assuming FileSystem.deleteNode throws if dir not empty?
                // Let's rely on FS or check ourselves.
                // Since FS is abstract here, we try to delete.

                // Hack: check if it has children?
                // `fs.getDirectoryChildren(path)`?
                // FileSystem interface in memory says:
                // getDirectoryEntries(path).
                const entries = this.fs.getDirectoryEntries(path);
                // POSIX: . and .. don't count.
                const validEntries = entries.filter(e => e !== '.' && e !== '..');
                if (validEntries.length > 0) {
                    return { output: `rmdir: failed to remove '${dir}': Directory not empty`, newState: state, exitCode: 1 };
                }

                this.fs.deleteNode(path);
            } catch (e: any) {
                return { output: `rmdir: failed to remove '${dir}': ${e.message}`, newState: state, exitCode: 1 };
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
}
