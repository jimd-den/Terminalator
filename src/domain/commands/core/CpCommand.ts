import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * CpCommand - Core Command
 *
 * Copies files or directories.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to duplicate data.
 */

import { CommandBase } from '../CommandBase';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { FileSystemService } from '../../services/FileSystemService';
import { DirectoryNode } from '../../entities/filesystem/DirectoryNode';

export class CpCommand extends CommandBase {
    constructor(private fsService: FileSystemService) { super(); }

    executeInternal(args: string[], flags: Set<string>, operands: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const recursive = this.hasFlag('r') || this.hasFlag('R');

        if (operands.length < 2) {
            return {
                output: 'cp: missing file operand',
                newState: state,
                exitCode: 1
            };
        }

        const sources = operands.slice(0, operands.length - 1);
        const destination = operands[operands.length - 1];

        // Process destination
        // Use new resolveAbsolutePath
        const destPath = this.fsService.resolveAbsolutePath(destination, state.currentDirectory);
        const destNode = this.fsService.resolve(destPath); // Still need resolve to check existence/type
        const destIsDir = destNode ? this.fsService.isDirectory(destNode) : destination.endsWith('/');

        // If multiple sources, dest MUST be a directory
        if (sources.length > 1 && destNode && !destIsDir) {
            return {
                output: `cp: target '${destination}' is not a directory`,
                newState: state,
                exitCode: 1
            };
        }

        for (const source of sources) {
            const srcPath = this.fsService.resolveAbsolutePath(source, state.currentDirectory);
            const srcNode = this.fsService.resolve(srcPath);

            if (!srcNode) {
                return {
                    output: `cp: cannot stat '${source}': No such file or directory`,
                    newState: state,
                    exitCode: 1
                };
            }

            const srcIsDir = this.fsService.isDirectory(srcNode);

            if (srcIsDir) {
                if (!recursive) {
                    return {
                        output: `cp: -r not specified; omitting directory '${source}'`,
                        newState: state,
                        exitCode: 1
                    };
                }

                // Recursive copy logic
                try {
                    let finalDest = destPath;
                    if (destIsDir) {
                        finalDest = destPath === '/' ? `/${srcNode.name}` : `${destPath}/${srcNode.name}`;
                    }

                    this.copyRecursive(srcPath, finalDest);
                } catch (e: any) {
                    return {
                        output: `cp: error copying '${source}': ${e.message}`,
                        newState: state,
                        exitCode: 1
                    };
                }

            } else {
                // File copy
                try {
                    let finalDest = destPath;
                    if (destIsDir) {
                        finalDest = destPath === '/' ? `/${srcNode.name}` : `${destPath}/${srcNode.name}`;
                    }

                    const content = this.fsService.readFile(srcPath);
                    this.fsService.writeFile(finalDest, content, 'w');
                } catch (e: any) {
                    return {
                        output: `cp: cannot create regular file '${destination}': ${e.message}`,
                        newState: state,
                        exitCode: 1
                    };
                }
            }
        }

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }

    private copyRecursive(srcPath: string, destPath: string) {
        // Create destination directory
        if (!this.fsService.resolve(destPath)) {
            this.fsService.mkdir(destPath, 0o755);
        }

        const srcNode = this.fsService.resolve(srcPath);
        if (!srcNode || !this.fsService.isDirectory(srcNode)) return;

        const children = Array.from((srcNode as DirectoryNode).children.values());
        for (const child of children) {
            const childSrcPath = srcPath === '/' ? `/${child.name}` : `${srcPath}/${child.name}`;
            const childDestPath = destPath === '/' ? `/${child.name}` : `${destPath}/${child.name}`;

            if (this.fsService.isDirectory(child)) {
                this.copyRecursive(childSrcPath, childDestPath);
            } else {
                const content = this.fsService.readFile(childSrcPath);
                this.fsService.writeFile(childDestPath, content, 'w');
            }
        }
    }
}
