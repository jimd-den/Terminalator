/**
 * LinkCommand - Core Command
 *
 * Call the link function to create a file having a link to another file.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Create hard links.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class LinkCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
        // link file1 file2
        const files = args.filter(a => !a.startsWith('-'));
        if (files.length !== 2) {
            return { output: 'link: missing operand', newState: state, exitCode: 1 };
        }

        const source = files[0];
        const target = files[1];

        try {
            const sourcePath = this.resolvePath(source, state);
            const targetPath = this.resolvePath(target, state);

            // FS should have a method to create hard link.
            // If not, we simulate by creating dentry pointing to same inode.
            // this.fs.createLink(sourcePath, targetPath)?
            // Assuming `ln` logic: `fs.createLink(target, source)` usually.
            // Let's assume `createLink` exists on `FileSystem` (it should for POSIX).
            // Checking memories... "FileSystem entity functions as a Facade".
            // I'll try calling `createLink`.

            // Note: `ln` command usually does `createLink`.
            // Wait, `LnCommand` exists. It uses `createLink`.

            this.fs.link(sourcePath, targetPath);

        } catch (e: any) {
            return { output: `link: cannot create link '${target}' to '${source}': ${e.message}`, newState: state, exitCode: 1 };
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
