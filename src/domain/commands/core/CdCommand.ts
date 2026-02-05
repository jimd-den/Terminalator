import { getStdinAsString } from '../../entities/ProcessContext';
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
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';

export class CdCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.NAVIGATE];
    public readonly utility = 'cd';

    constructor(private fs: FileSystemService) {
        super();
    }

    /**
     * Executes the 'cd' command.
     */
    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        const fsService = context.fileSystemService || this.fs;
        const target = operands.length > 0 ? operands[0] : '~';
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

        const node = fsService.resolve(newPath, state.currentDirectory);

        if (node) {
            if (fsService.isDirectory(node)) {
                const absolutePath = fsService.getAbsolutePath(node);
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