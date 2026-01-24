import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * FileCommand - Core Command
 *
 * Determine file type.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Watchman’s Log (Telemetry)
 *
 * Intent:
 * Inspects inode metadata and content to report file type.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem, S_IFDIR, S_IFLNK, S_IFREG, S_IFIFO, S_IFMT } from '../../entities/FileSystem';

export class FileCommand implements ICommand {
    constructor(private fs: FileSystemService) {}

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        if (args.length === 0) {
            return { output: 'usage: file file...', newState: state, exitCode: 1 };
        }

        const results: string[] = [];
        let finalExitCode = 0;

        for (const arg of args) {
            if (arg.startsWith('-')) continue; // Ignore flags for now

            const dentry = this.fs.resolve(arg, state.currentDirectory);
            if (!dentry) {
                results.push(`${arg}: cannot open '${arg}' (No such file or directory)`);
                finalExitCode = 1;
                continue;
            }

            const inode = this.fs.getInode(dentry.inodeId);
            if (!inode) {
                results.push(`${arg}: error reading inode`);
                finalExitCode = 1;
                continue;
            }

            let type = 'data';
            const modeType = inode.mode & S_IFMT;

            if (modeType === S_IFDIR) {
                type = 'directory';
            } else if (modeType === S_IFLNK) {
                type = 'symbolic link';
            } else if (modeType === S_IFIFO) {
                type = 'fifo (named pipe)';
            } else if (modeType === S_IFREG) {
                if (inode.size === 0) {
                    type = 'empty';
                } else {
                    // Check content for null bytes
                    const content = inode.content as string;
                    // Simple heuristic for text vs binary
                    // In JS strings, \0 is allowed.
                    if (content.indexOf('\0') !== -1) {
                        type = 'data';
                    } else {
                        type = 'ASCII text';
                    }
                }
            } else {
                 type = 'special file';
            }

            results.push(`${arg}: ${type}`);
        }

        return { output: results.join('\n'), newState: state, exitCode: finalExitCode };
    }
}
