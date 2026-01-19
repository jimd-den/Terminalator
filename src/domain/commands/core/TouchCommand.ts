/**
 * TouchCommand - Core Command
 *
 * Updates file timestamps or creates empty files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to create files or signal updates.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem, S_IFREG } from '../../entities/FileSystem';

export class TouchCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        // Parse flags
        let noCreate = false; // -c
        const targets: string[] = [];

        for (const arg of args) {
            if (arg === '-c') {
                noCreate = true;
            } else if (arg.startsWith('-')) {
                // Ignore other flags
            } else {
                targets.push(arg);
            }
        }

        if (targets.length === 0) {
            return {
                output: 'touch: missing operand',
                newState: state,
                exitCode: 1
            };
        }

        let exitCode = 0;
        let output = '';

        for (const target of targets) {
            let path = target;
            if (!target.startsWith('/')) {
                path = state.currentDirectory === '/'
                    ? `/${target}`
                    : `${state.currentDirectory}/${target}`;
            }

            // Remove trailing slash if present (unless it is root) to correctly identify parent
            if (path.length > 1 && path.endsWith('/')) {
                path = path.slice(0, -1);
            }

            const existing = this.fs.resolveNode(path);

            if (existing) {
                // Update timestamps
                const inode = this.fs.getInode(existing.inodeId);
                if (inode) {
                    const now = Date.now();
                    inode.mtime = now;
                    inode.atime = now;
                    inode.ctime = now;
                }
            } else {
                // If -c is set, do NOT create file if it doesn't exist
                if (noCreate) {
                    continue;
                }

                // Create new empty file
                // We need to verify parent exists
                const lastSlashIndex = path.lastIndexOf('/');
                const parentPath = lastSlashIndex === 0 ? '/' : path.substring(0, lastSlashIndex);

                const parent = this.fs.resolveNode(parentPath);

                if (!parent || !this.fs.isDirectory(parent)) {
                    output += `touch: cannot touch '${target}': No such file or directory\n`;
                    exitCode = 1;
                    continue;
                }

                try {
                    this.fs.writeFile(path, '', 'w');
                } catch (e: any) {
                    output += `touch: cannot touch '${target}': ${e.message}\n`;
                    exitCode = 1;
                }
            }
        }

        return {
            output: output.trim(),
            newState: state,
            exitCode: exitCode
        };
    }
}
