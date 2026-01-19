/**
 * MkdirCommand - Core Command
 *
 * Creates directories, supporting parent creation with -p.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to expand the file system hierarchy.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class MkdirCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const flags = args.filter(arg => arg.startsWith('-'));
        const targets = args.filter(arg => !arg.startsWith('-'));
        const createParents = flags.some(f => f.includes('p'));

        if (targets.length === 0) {
            return {
                output: 'mkdir: missing operand',
                newState: state,
                exitCode: 1
            };
        }

        for (const target of targets) {
            // Resolve path absolute or relative
            let path = target;
            if (!target.startsWith('/')) {
                path = state.currentDirectory === '/'
                    ? `/${target}`
                    : `${state.currentDirectory}/${target}`;
            }

            // Check existence
            const existing = this.fs.resolveNode(path);
            if (existing) {
                if (createParents && this.fs.isDirectory(existing)) {
                    continue; // -p suppresses error if dir exists
                }
                return {
                    output: `mkdir: cannot create directory '${target}': File exists`,
                    newState: state,
                    exitCode: 1
                };
            }

            try {
                if (createParents) {
                    this.mkdirParents(path);
                } else {
                    // Strict mkdir: parent must exist
                    // Special case: if parent is root '/', it always exists.
                    // But we must resolve parent properly.
                    const lastSlash = path.lastIndexOf('/');
                    const parentPath = lastSlash <= 0 ? '/' : path.substring(0, lastSlash);

                    const parent = this.fs.resolveNode(parentPath);
                    if (!parent || !this.fs.isDirectory(parent)) {
                        return {
                            output: `mkdir: cannot create directory '${target}': No such file or directory`,
                            newState: state,
                            exitCode: 1
                        };
                    }
                    this.fs.mkdir(path, 0o755);
                }
            } catch (e: any) {
                return {
                    output: `mkdir: cannot create directory '${target}': ${e.message}`,
                    newState: state,
                    exitCode: 1
                };
            }
        }

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }

    private mkdirParents(path: string) {
        const parts = path.split('/').filter(p => p.length > 0);
        let currentPath = '';

        for (const part of parts) {
            currentPath += `/${part}`;
            const node = this.fs.resolveNode(currentPath);
            if (!node) {
                this.fs.mkdir(currentPath, 0o755);
            } else if (!this.fs.isDirectory(node)) {
                throw new Error(`'${currentPath}' exists and is not a directory`);
            }
        }
    }
}
