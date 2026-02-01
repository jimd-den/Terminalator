import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * RmdirCommand - Core Command
 *
 * Remove empty directories.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture) - Use Cases/Command
 * Pillar: The Balanced Scale (SOLID / KISS)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Provides a POSIX-compliant implementation for removing empty directories.
 * Supports the -p (parents) option to recursively remove parent directories.
 *
 * Design:
 * Uses small, composable functions for path logic and orchestrates removal via the FileSystem.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';
import { S_IFDIR } from '../../entities/FileSystem';

/**
 * Pure function to resolve an absolute path from a relative path and CWD.
 */
export const resolveAbsolutePath = (path: string, cwd: string): string => {
    if (path.startsWith('/')) return path;
    const normalizedCwd = cwd.endsWith('/') ? cwd : `${cwd}/`;
    return `${normalizedCwd}${path}`.replace(/\/+/g, '/');
};

/**
 * Pure function to generate a sequence of parent directories for the -p option.
 * Example: "/a/b/c" -> ["/a/b/c", "/a/b", "/a"]
 */
export const getParentPaths = (path: string): string[] => {
    const parts = path.split('/').filter(p => p.length > 0);
    const paths: string[] = [];
    while (parts.length > 0) {
        paths.push('/' + parts.join('/'));
        parts.pop();
    }
    return paths;
};

export class RmdirCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    /**
     * Executes the rmdir command.
     */
    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        const timestamp = new Date().toISOString();
        this.log(`[${timestamp}] RmdirCommand.execute(args=${JSON.stringify(args)})`);

        const options = this.parseOptions(args);
        const targets = args.filter(arg => !arg.startsWith('-') || arg === '-');

        if (targets.length === 0) {
            return {
                output: 'rmdir: missing operand\n',
                newState: state,
                exitCode: 1
            };
        }

        let overallExitCode = 0;
        let cumulativeOutput = '';

        for (const target of targets) {
            const result = this.handleOperand(target, options.parents, state.currentDirectory);
            if (result.exitCode !== 0) {
                overallExitCode = 1;
                cumulativeOutput += result.output;
            }
        }

        this.log(`[${new Date().toISOString()}] RmdirCommand.execute returns exitCode=${overallExitCode}`);
        return {
            output: cumulativeOutput,
            newState: state,
            exitCode: overallExitCode
        };
    }

    /**
     * Parses command line options.
     */
    private parseOptions(args: string[]): { parents: boolean } {
        return {
            parents: args.some(arg => arg === '-p')
        };
    }

    /**
     * Handles a single directory operand, optionally with parent removal.
     */
    private handleOperand(target: string, parents: boolean, cwd: string): { output: string, exitCode: number } {
        const absolutePath = resolveAbsolutePath(target, cwd);

        if (parents) {
            const pathsToRemoval = getParentPaths(absolutePath);
            for (const path of pathsToRemoval) {
                try {
                    this.performRemoval(path);
                } catch (e: any) {
                    // If -p is used, errors for parent directories (except the first) are often ignored
                    // unless they are critical. However, POSIX says we should diagnostic if not fully removed.
                    // But if the leaf failed, that's a definite error.
                    if (path === absolutePath) {
                        return { output: `rmdir: failed to remove '${target}': ${e.message}\n`, exitCode: 1 };
                    }
                    // Stop recursion on the first failure of a parent
                    break;
                }
            }
        } else {
            try {
                this.performRemoval(absolutePath);
            } catch (e: any) {
                return { output: `rmdir: failed to remove '${target}': ${e.message}\n`, exitCode: 1 };
            }
        }

        return { output: '', exitCode: 0 };
    }

    /**
     * Validates and removes a single directory via the FileSystem.
     */
    private performRemoval(path: string): void {
        const node = this.fs.resolve(path);
        if (!node) {
            throw new Error('No such file or directory');
        }

        const inode = this.fs.getInode(node.inodeId);
        if (!inode || !(inode.mode & S_IFDIR)) {
            throw new Error('Not a directory');
        }

        if (node.children.size > 0) {
            throw new Error('Directory not empty');
        }

        if (path === '/') {
            throw new Error('Operation not permitted');
        }

        this.fs.deleteNode(path);
    }

    private log(message: string) {
        // Observability hook
    }
}
