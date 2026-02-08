import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * LnCommand - Core Command
 *
 * Creates links (hard or soft).
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to create links between files.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';

export class LnCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.MODIFY];
    public readonly utility = 'ln';

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
        const symbolic = flags.has('s');
        const force = flags.has('f');

        if (operands.length < 2) {
            return {
                output: 'ln: missing file operand',
                newState: state,
                exitCode: 1
            };
        }

        const target = operands[0];
        const linkName = operands[1];

        let finalLinkPath = linkName;

        let linkNode = this.fs.resolve(linkName.startsWith('/') ? linkName : (state.currentDirectory === '/' ? `/${linkName}` : `${state.currentDirectory}/${linkName}`));

        if (linkNode && this.fs.isDirectory(linkNode)) {
            const targetBase = target.substring(target.lastIndexOf('/') + 1);
            finalLinkPath = linkName.endsWith('/') ? `${linkName}${targetBase}` : `${linkName}/${targetBase}`;
        }

        let absLinkPath = finalLinkPath;
        if (!finalLinkPath.startsWith('/')) {
            absLinkPath = state.currentDirectory === '/'
                ? `/${finalLinkPath}`
                : `${state.currentDirectory}/${finalLinkPath}`;
        }

        try {
            if (symbolic) {
                this.fs.symlink(target, absLinkPath, 1000, 1000, '/');
            } else {
                let absTarget = target;
                if (!target.startsWith('/')) {
                    absTarget = state.currentDirectory === '/'
                        ? `/${target}`
                        : `${state.currentDirectory}/${target}`;
                }
                this.fs.link(absTarget, absLinkPath, '/');
            }
        } catch (e: any) {
            return {
                output: `ln: ${e.message}`,
                newState: state,
                exitCode: 1
            };
        }

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}