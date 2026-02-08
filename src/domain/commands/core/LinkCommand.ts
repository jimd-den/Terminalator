import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * LinkCommand - Core Command
 *
 * Call the link function to create a file having a link to another file.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Create hard links.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

export class LinkCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.MODIFY];
    public readonly utility = 'link';

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
        if (operands.length !== 2) {
            return { output: 'link: missing operand', newState: state, exitCode: 1 };
        }

        const source = operands[0];
        const target = operands[1];

        try {
            const sourcePath = this.resolvePath(source, state);
            const targetPath = this.resolvePath(target, state);

            this.fs.link(sourcePath, targetPath);

        } catch (e: any) {
            return { output: `link: cannot create link '${target}' to '${source}': ${e.message}`, newState: state, exitCode: 1 };
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