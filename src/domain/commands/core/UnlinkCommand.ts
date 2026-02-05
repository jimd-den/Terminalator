import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * UnlinkCommand - Core Command
 *
 * Call the unlink function to remove the specified file.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Remove a directory entry.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

export class UnlinkCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.MODIFY];
    public readonly utility = 'unlink';

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
        if (operands.length === 0) {
            return { output: 'unlink: missing operand', newState: state, exitCode: 1 };
        }

        const file = operands[0];

        try {
            const path = this.resolvePath(file, state);
            const node = this.fs.resolve(path);
            if (!node) {
                return { output: `unlink: cannot unlink '${file}': No such file or directory`, newState: state, exitCode: 1 };
            }

            const inode = this.fs.getInode(node.inodeId);
            if (inode!.mode & 0o040000) {
                return { output: `unlink: cannot unlink '${file}': Is a directory`, newState: state, exitCode: 1 };
            }

            this.fs.deleteNode(path);

        } catch (e: any) {
            return { output: `unlink: cannot unlink '${file}': ${e.message}`, newState: state, exitCode: 1 };
        }

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}