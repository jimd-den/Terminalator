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
 */

import { CommandBase } from '../CommandBase';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

export class MvCommand extends CommandBase {
    constructor(private fsService: FileSystemService) { super(); }

    executeInternal(args: string[], flags: Set<string>, operands: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        // Flags handled by base class (though Mv ignores most)

        if (operands.length < 2) {
            return {
                output: 'mv: missing file operand',
                newState: state,
                exitCode: 1
            };
        }

        const sources = operands.slice(0, operands.length - 1);
        const destination = operands[operands.length - 1];

        // Process destination
        const destPath = this.fsService.resolveAbsolutePath(destination, state.currentDirectory);
        const destNode = this.fsService.resolve(destPath);
        const destIsDir = destNode ? this.fsService.isDirectory(destNode) : destination.endsWith('/');

        // If multiple sources, dest MUST be a directory
        if (sources.length > 1 && destNode && !destIsDir) {
            return {
                output: `mv: target '${destination}' is not a directory`,
                newState: state,
                exitCode: 1
            };
        }

        for (const source of sources) {
            const srcPath = this.fsService.resolveAbsolutePath(source, state.currentDirectory);
            const srcNode = this.fsService.resolve(srcPath);

            if (!srcNode) {
                return {
                    output: `mv: cannot stat '${source}': No such file or directory`,
                    newState: state,
                    exitCode: 1
                };
            }

            // Check if source is directory and dest is file (FAIL)
            // If dest doesn't exist but is treated as file (not ending in /) -> renaming dir to file is valid?
            // "mv dir file" -> rename dir to file. Valid.
            // "mv dir existing_file" -> fail (cannot overwrite file with dir).
            if (this.fsService.isDirectory(srcNode) && destNode && !this.fsService.isDirectory(destNode)) {
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

                // If finalDest is same as srcPath, do nothing and return 0
                if (srcPath === finalDest) {
                    continue; // No-op, exit code 0 implied for this item
                }

                this.fsService.rename(srcPath, finalDest);

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
