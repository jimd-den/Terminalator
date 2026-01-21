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
import { FileSystemService } from '../../services/FileSystemService';

export class CdCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    /**
     * Executes the 'cd' command.
     *
     * @param args - Arguments passed to cd (target directory).
     * @param state - Current terminal state.
     */
    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
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

        const node = this.fs.resolve(newPath, state.currentDirectory);

        if (node) {
            if (this.fs.isDirectory(node)) {
                const absolutePath = this.fs.getAbsolutePath(node);
                return {
                    output: target === '-' ? absolutePath : '',
                    newState: {
                        ...state,
                        currentDirectory: absolutePath,
                        environment: {
                            ...state.environment,
                            OLDPWD: state.currentDirectory
                        }
                    },
                    exitCode: 0
                };
            } else {
                return {
                    output: `cd: ${target}: Not a directory`,
                    newState: state,
                    exitCode: 1
                };
            }
        }

        return {
            output: `cd: ${target}: No such file or directory`,
            newState: state,
            exitCode: 1
        };
    }
}
