import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * MkdirCommand - Core Command
 *
 * Creates directories, supporting parent creation with -p and mode setting with -m.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to expand the file system hierarchy.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';
import { ModeParser } from '../../services/ModeParser';

export class MkdirCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.MODIFY];
    public readonly utility = 'mkdir';

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
        const fsService = context.fileSystemService || this.fs;
        
        const parents = flags.has('p');
        const modeStr = this.options.get('m');

        if (operands.length === 0) {
            return {
                output: 'mkdir: missing operand',
                newState: state,
                exitCode: 1
            };
        }

        let exitCode = 0;
        let outputString = '';

        for (const target of operands) {
            const result = this.createPath(target, parents, modeStr, state, fsService);
            if (result.error) {
                outputString += `mkdir: ${result.error}\n`;
                exitCode = 1;
            }
        }

        if (outputString.endsWith('\n')) outputString = outputString.slice(0, -1);

        return {
            output: outputString,
            newState: state,
            exitCode: exitCode
        };
    }

    /**
     * Override parseArgs to support -m value.
     */
    protected override parseArgs(args: string[]) {
        super.parseArgs(args, ['m']);
    }

    private createPath(target: string, parents: boolean, modeStr: string | undefined, state: TerminalState, fsService: FileSystemService): { error?: string } {
        const fullPath = this.resolvePath(target, state);
        const components = this.getPathComponents(fullPath);

        // Check search permissions for all but the last component
        let current = '/';
        for (let i = 0; i < components.length; i++) {
            const node = fsService.resolve(current);
            if (node && !this.hasSearchPermission(node, state.user, fsService)) {
                return { error: `cannot create directory '${target}': Permission denied` };
            }
            if (i === components.length - 1) break;

            current += (current === '/' ? '' : '/') + components[i];

            const existingNode = fsService.resolve(current);
            if (existingNode && !fsService.isDirectory(existingNode)) {
                return { error: `cannot create directory '${target}': File exists` };
            }
        }

        if (parents) {
            return this.createPathWithParents(components, modeStr, state.user, fsService);
        } else {
            return this.createSinglePath(fullPath, modeStr, state.user, fsService);
        }
    }

    private createSinglePath(path: string, modeStr: string | undefined, user: { uid: number, gid: number, groups: number[] } | string, fsService: FileSystemService): { error?: string } {
        const node = fsService.resolve(path);
        if (node) {
            return { error: `cannot create directory '${path}': File exists` };
        }

        const parentPath = this.getParentPath(path);
        const parent = fsService.resolve(parentPath);
        if (!parent || !fsService.isDirectory(parent)) {
            return { error: `cannot create directory '${path}': No such file or directory` };
        }

        try {
            const mode = modeStr ? ModeParser.parse(modeStr, 0o777) : 0o755;
            fsService.mkdir(path, mode);
            return {};
        } catch (e: any) {
            return { error: `cannot create directory '${path}': ${e.message}` };
        }
    }

    private createPathWithParents(components: string[], modeStr: string | undefined, user: { uid: number, gid: number, groups: number[] } | string, fsService: FileSystemService): { error?: string } {
        let currentPath = '';
        const len = components.length;

        for (let i = 0; i < len; i++) {
            currentPath += `/${components[i]}`;
            const node = fsService.resolve(currentPath);

            if (!node) {
                try {
                    const isLast = (i === len - 1);
                    const mode = isLast
                        ? (modeStr ? ModeParser.parse(modeStr, 0o777) : 0o755)
                        : 0o755;

                    fsService.mkdir(currentPath, mode);
                } catch (e: any) {
                    return { error: `cannot create directory '${currentPath}': ${e.message}` };
                }
            } else if (!fsService.isDirectory(node)) {
                return { error: `cannot create directory '${currentPath}': File exists` };
            }
        }
        return {};
    }

    private hasSearchPermission(dentry: any, user: { uid: number, gid: number, groups: number[] } | string, fsService: FileSystemService): boolean {
        if (user === 'root') return true;
        const inode = fsService.getInode(dentry.inodeId);
        if (!inode) return false;

        const mode = inode.mode;
        return (mode & 0o001) !== 0 || (typeof user === 'string' && user === 'operator' && (mode & 0o100) !== 0);
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return this.normalizePath(path);
        const base = state.currentDirectory === '/' ? '' : state.currentDirectory;
        return this.normalizePath(`${base}/${path}`);
    }

    private normalizePath(path: string): string {
        const parts = path.split('/').filter(p => p.length > 0 && p !== '.');
        const stack: string[] = [];
        for (const part of parts) {
            if (part === '..') {
                if (stack.length > 0) stack.pop();
            } else {
                stack.push(part);
            }
        }
        return '/' + stack.join('/');
    }

    private getPathComponents(path: string): string[] {
        return path.split('/').filter(p => p.length > 0);
    }

    private getParentPath(path: string): string {
        const parts = path.split('/').filter(p => p.length > 0);
        if (parts.length <= 1) return '/';
        return '/' + parts.slice(0, -1).join('/');
    }
}