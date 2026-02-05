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
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';
import { S_IFDIR } from '../../entities/FileSystem';
import { DirectoryNode } from '../../entities/filesystem/DirectoryNode';

export class RmdirCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.MODIFY];
    public readonly utility = 'rmdir';

    constructor(private fs: FileSystemService) { 
        super();
    }

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        const parents = flags.has('p');

        if (operands.length === 0) {
            return {
                output: 'rmdir: missing operand\n',
                newState: state,
                exitCode: 1
            };
        }

        let overallExitCode = 0;
        let cumulativeOutput = '';

        for (const target of operands) {
            const result = this.handleOperand(target, parents, state.currentDirectory);
            if (result.exitCode !== 0) {
                overallExitCode = 1;
                cumulativeOutput += result.output;
            }
        }

        return {
            output: cumulativeOutput,
            newState: state,
            exitCode: overallExitCode
        };
    }

    private handleOperand(target: string, parents: boolean, cwd: string): { output: string, exitCode: number } {
        const absolutePath = this.resolveAbsolutePath(target, cwd);

        if (parents) {
            const pathsToRemoval = this.getParentPaths(absolutePath);
            for (const path of pathsToRemoval) {
                try {
                    this.performRemoval(path);
                } catch (e: any) {
                    if (path === absolutePath) {
                        return { output: `rmdir: failed to remove '${target}': ${e.message}\n`, exitCode: 1 };
                    }
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

    private performRemoval(path: string): void {
        const node = this.fs.resolve(path);
        if (!node) {
            throw new Error('No such file or directory');
        }

        const inode = this.fs.getInode(node.inodeId);
        if (!inode || !(inode.mode & S_IFDIR)) {
            throw new Error('Not a directory');
        }

        const dirNode = node as DirectoryNode;
        if (dirNode.children.size > 0) {
            throw new Error('Directory not empty');
        }

        if (path === '/') {
            throw new Error('Operation not permitted');
        }

        this.fs.deleteNode(path);
    }

    private resolveAbsolutePath(path: string, cwd: string): string {
        if (path.startsWith('/')) return path;
        const normalizedCwd = cwd.endsWith('/') ? cwd : `${cwd}/`;
        return `${normalizedCwd}${path}`.replace(/\/+/g, '/');
    }

    private getParentPaths(path: string): string[] {
        const parts = path.split('/').filter(p => p.length > 0);
        const paths: string[] = [];
        while (parts.length > 0) {
            paths.push('/' + parts.join('/'));
            parts.pop();
        }
        return paths;
    }
}