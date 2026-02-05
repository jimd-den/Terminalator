import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * MvCommand - Core Command
 *
 * Moves or renames files and directories.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to relocate nodes in the file system.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { FileSystemService } from '../../services/FileSystemService';

export class MvCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.MODIFY];
    public readonly utility = 'mv';

    constructor(private fsService: FileSystemService) { super(); }

    executeInternal(args: string[], flags: Set<string>, operands: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const fsService = context.fileSystemService || this.fsService;

        if (operands.length < 2) {
            return {
                output: 'mv: missing file operand',
                newState: state,
                exitCode: 1
            };
        }

        const sources = operands.slice(0, operands.length - 1);
        const destination = operands[operands.length - 1];

        const destPath = fsService.resolveAbsolutePath(destination, state.currentDirectory);
        const destNode = fsService.resolve(destPath);
        const destIsDir = destNode ? fsService.isDirectory(destNode) : destination.endsWith('/');

        if (sources.length > 1 && destNode && !destIsDir) {
            return {
                output: `mv: target '${destination}' is not a directory`,
                newState: state,
                exitCode: 1
            };
        }

        for (const source of sources) {
            const srcPath = fsService.resolveAbsolutePath(source, state.currentDirectory);
            const srcNode = fsService.resolve(srcPath);

            if (!srcNode) {
                return {
                    output: `mv: cannot stat '${source}': No such file or directory`,
                    newState: state,
                    exitCode: 1
                };
            }

            if (fsService.isDirectory(srcNode) && destNode && !fsService.isDirectory(destNode)) {
                return {
                    output: `mv: cannot overwrite non-directory '${destination}' with directory '${source}'`,
                    newState: state,
                    exitCode: 1
                };
            }

            try {
                let finalDest = destPath;
                if (destIsDir) {
                    finalDest = destPath === '/' ? `/${srcNode.name}` : `${destPath}/${srcNode.name}`;
                }

                if (srcPath === finalDest) {
                    continue;
                }

                fsService.rename(srcPath, finalDest);

            } catch (e: any) {
                return {
                    output: `mv: cannot move '${source}' to '${destination}': ${e.message}`,
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
}