/**
 * CdCommand - Core Command
 *
 * Changes the current working directory.
 * Implements POSIX-like behavior for directory navigation.
 *
 * Pillar: The Swift Stream (Performance & Purity)
 * Pillar: The Balanced Scale (SOLID / KISS)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to navigate the file system hierarchy.
 * Critical for exploration and locating mission objectives.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class CdCommand implements ICommand {
    constructor(private fs: FileSystem) {}

    /**
     * Executes the 'cd' command.
     *
     * @param args - Arguments passed to cd (target directory).
     * @param state - Current terminal state.
     */
    execute(args: string[], state: TerminalState): CommandResponse {
        const target = args.length > 0 ? args[0] : '~';
        let newPath = target;

        // Handle '~' (Home Directory)
        if (target === '~') {
            newPath = state.environment.HOME || '/home/operator';
        }
        // Handle '-' (Previous Directory)
        else if (target === '-') {
            if (state.environment.OLDPWD) {
                newPath = state.environment.OLDPWD;
            } else {
                return {
                    output: 'cd: OLDPWD not set',
                    newState: state,
                    exitCode: 1
                };
            }
        }
        // Handle absolute path
        else if (target.startsWith('/')) {
            newPath = target;
        }
        // Handle relative path
        else {
            newPath = state.currentDirectory === '/'
                ? `/${target}`
                : `${state.currentDirectory}/${target}`;
        }

        // Normalize path (handle '..' and '.')
        // We do this manually to simulate path resolution on the virtual FS
        const normalizedPath = this.normalizePath(newPath, state.currentDirectory);

        // Verify existence
        const node = this.fs.getNode(normalizedPath);
        if (node && node.type === 'directory') {
            return {
                output: target === '-' ? normalizedPath : '', // 'cd -' prints the new directory
                newState: {
                    ...state,
                    currentDirectory: normalizedPath,
                    environment: {
                        ...state.environment,
                        OLDPWD: state.currentDirectory
                    }
                },
                exitCode: 0
            };
        }

        return {
            output: `cd: ${target}: no such file or directory`,
            newState: state,
            exitCode: 1
        };
    }

    /**
     * Normalizes a file path, resolving '..' and '.' segments.
     *
     * @param path - The path to normalize.
     * @param currentDir - The current directory (used if we needed to resolve absolute from relative, but we already did that).
     */
    private normalizePath(path: string, currentDir: string): string {
        // Simple normalization
        const parts = path.split('/');
        const stack: string[] = [];

        for (const part of parts) {
            if (part === '' || part === '.') continue;
            if (part === '..') {
                if (stack.length > 0) {
                    stack.pop();
                }
            } else {
                stack.push(part);
            }
        }

        return '/' + stack.join('/');
    }
}
