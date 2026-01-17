/**
 * RmCommand - Core Command
 *
 * Removes files or directories.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to delete nodes from the file system.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class RmCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const flags = args.filter(arg => arg.startsWith('-'));
        const targets = args.filter(arg => !arg.startsWith('-'));
        const recursive = flags.some(f => f.includes('r') || f.includes('R'));
        const force = flags.some(f => f.includes('f'));

        if (targets.length === 0) {
            return {
                output: 'rm: missing operand',
                newState: state,
                exitCode: 1
            };
        }

        for (const target of targets) {
            let path = target;
            if (!target.startsWith('/')) {
                path = state.currentDirectory === '/'
                    ? `/${target}`
                    : `${state.currentDirectory}/${target}`;
            }

            const existing = this.fs.resolveNode(path);

            if (!existing) {
                if (force) continue;
                return {
                    output: `rm: cannot remove '${target}': No such file or directory`,
                    newState: state,
                    exitCode: 1
                };
            }

            // Check if directory
            if (this.fs.isDirectory(existing)) {
                if (!recursive) {
                    return {
                        output: `rm: cannot remove '${target}': Is a directory`,
                        newState: state,
                        exitCode: 1
                    };
                }

                // Recursive deletion
                try {
                    this.deleteRecursive(path);
                } catch (e: any) {
                    return {
                        output: `rm: cannot remove '${target}': ${e.message}`,
                        newState: state,
                        exitCode: 1
                    };
                }
            } else {
                // Remove file
                try {
                    this.fs.deleteNode(path);
                } catch (e: any) {
                    // Should not happen if we resolved it, unless permissions/race
                    return {
                        output: `rm: cannot remove '${target}': ${e.message}`,
                        newState: state,
                        exitCode: 1
                    };
                }
            }
        }

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }

    private deleteRecursive(path: string) {
        const node = this.fs.resolveNode(path);
        if (!node) return;

        if (this.fs.isDirectory(node)) {
            // Delete all children first
            // We need to copy keys to avoid modification during iteration if we were deleting in loop
            // But Map iteration is usually safe if we just get values
            const children = Array.from(node.children.values());
            for (const child of children) {
                // Construct child path
                // path is absolute 
                const childPath = path === '/' ? `/${child.name}` : `${path}/${child.name}`;
                this.deleteRecursive(childPath);
            }
        }

        // Now valid to delete (empty dir or file)
        this.fs.deleteNode(path);
    }
}
