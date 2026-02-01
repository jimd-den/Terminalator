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
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';
import { ModeParser } from '../../services/ModeParser';

export class MkdirCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const fsService = context.fileSystemService || this.fs;
        const input = getStdinAsString(context);
        this.logExecution('MkdirCommand.execute', { args, state });

        const options = this.parseOptions(args);
        if (options.error) {
            return {
                output: `mkdir: ${options.error}`,
                newState: state,
                exitCode: 1
            };
        }

        if (options.targets.length === 0) {
            return {
                output: 'mkdir: missing operand',
                newState: state,
                exitCode: 1
            };
        }

        let exitCode = 0;
        let outputString = '';

        for (const target of options.targets) {
            const result = this.createPath(target, options, state, fsService);
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

    private parseOptions(args: string[]): { parents: boolean, modeStr?: string, targets: string[], error?: string } {
        let parents = false;
        let modeStr: string | undefined;
        let targets: string[] = [];
        let i = 0;

        while (i < args.length) {
            const arg = args[i];
            if (arg === '--') {
                targets.push(...args.slice(i + 1));
                break;
            }
            if (arg.startsWith('-') && arg.length > 1) {
                const flagPart = arg.slice(1);
                if (flagPart.startsWith('-')) { // Long options (not required by POSIX but good practice)
                    // No long options for mkdir in POSIX
                    return { parents: false, targets: [], error: `invalid option -- '${arg}'` };
                }

                let stop = false;
                for (let j = 0; j < flagPart.length; j++) {
                    const char = flagPart[j];
                    if (char === 'p') {
                        parents = true;
                    } else if (char === 'm') {
                        // Mode can be in next arg or rest of this arg
                        if (j + 1 < flagPart.length) {
                            modeStr = flagPart.slice(j + 1);
                            stop = true;
                        } else if (i + 1 < args.length) {
                            modeStr = args[++i];
                            stop = true;
                        } else {
                            return { parents: false, targets: [], error: "option requires an argument -- 'm'" };
                        }
                    } else {
                        return { parents: false, targets: [], error: `invalid option -- '${char}'` };
                    }
                    if (stop) break;
                }
            } else {
                targets.push(arg);
            }
            i++;
        }

        return { parents, modeStr, targets };
    }

    private createPath(target: string, options: any, state: TerminalState, fsService: FileSystemService): { error?: string } {
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

            // If component exists and is not a directory, that's an error for mkdir -p too if it's intermediate
            const existingNode = fsService.resolve(current);
            if (existingNode && !fsService.isDirectory(existingNode)) {
                return { error: `cannot create directory '${target}': File exists` };
            }
        }

        if (options.parents) {
            return this.createPathWithParents(components, options.modeStr, state.user, fsService);
        } else {
            return this.createSinglePath(fullPath, options.modeStr, state.user, fsService);
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
            // Default POSIX mode for mkdir is a=rwx (0777) modified by umask.
            // Our sim uses 0755 as default.
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
                    // POSIX: intermediate dirs created with mode 0 modified by u+wx
                    // Final dir created with specified mode (or default)
                    const isLast = (i === len - 1);
                    const mode = isLast
                        ? (modeStr ? ModeParser.parse(modeStr, 0o777) : 0o755)
                        : 0o755; // Intermediate default

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

        // Simplified permission check
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

    private logExecution(fn: string, data: any) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${fn} input:`, JSON.stringify(data));
    }
}
