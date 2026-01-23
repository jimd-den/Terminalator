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

import { CommandBase } from '../CommandBase';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

export class RmCommand extends CommandBase {
    constructor(private fsService: FileSystemService) { super(); }

    executeInternal(args: string[], flags: Set<string>, targets: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const recursive = this.hasFlag('r') || this.hasFlag('R');
        const force = this.hasFlag('f');

        if (targets.length === 0) {
            return {
                output: 'rm: missing operand',
                newState: state,
                exitCode: 1
            };
        }

        for (const target of targets) {
            const path = this.fsService.resolveAbsolutePath(target, state.currentDirectory);
            const existing = this.fsService.resolve(path);

            if (!existing) {
                if (force) continue;
                return {
                    output: `rm: cannot remove '${target}': No such file or directory`,
                    newState: state,
                    exitCode: 1
                };
            }

            // Check if directory
            if (this.fsService.isDirectory(existing)) {
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
                    this.fsService.deleteNode(path);
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
        const node = this.fsService.resolve(path);
        if (!node) return;

        if (this.fsService.isDirectory(node)) {
            // Delete all children first
            const children = Array.from(node.children.values());
            for (const child of children) {
                const childPath = path === '/' ? `/${child.name}` : `${path}/${child.name}`;
                this.deleteRecursive(childPath);
            }
        }

        // Now valid to delete (empty dir or file)
        this.fsService.deleteNode(path);
    }
}
