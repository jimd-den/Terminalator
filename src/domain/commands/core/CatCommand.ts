import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * CatCommand - Core Command
 *
 * Concatenates and prints files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to view file contents.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';
import { PathResolver } from '../../services/filesystem/PathResolver';

export class CatCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.READ];
    public readonly utility = 'cat';

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
        const input = getStdinAsString(context);

        let output = '';

        if (operands.length === 0) {
            if (input !== undefined) {
                output = input;
            } else {
                return { output: 'cat: missing input', newState: state, exitCode: 1 };
            }
        } else {
            for (const filename of operands) {
                if (filename === '-') {
                    output += input || '';
                    continue;
                }

                const path = PathResolver.resolveString(filename, state.currentDirectory, state.environment.HOME);

                try {
                    const node = fsService.resolve(path);
                    const inode = node ? fsService.getInode(node.inodeId) : undefined;
                    if (node && inode && (inode.mode & 0o040000)) { // S_IFDIR
                        return { output: `cat: ${filename}: Is a directory`, newState: state, exitCode: 1 };
                    }
                    const content = fsService.readFile(path);
                    output += content;
                } catch (error: any) {
                    return {
                        output: `cat: ${filename}: No such file or directory`,
                        newState: state,
                        exitCode: 1
                    };
                }
            }
        }

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }
}