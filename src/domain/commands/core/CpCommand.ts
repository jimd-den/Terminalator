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
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';

import { CommandCapability } from '../IStructuredCommand';

import { ProcessContext } from '../../../domain/entities/ProcessContext';

import { TerminalState } from '../../entities/TerminalState';

import { CommandResponse, CommandMetadata } from '../../entities/Command';

import { TheatricalVerb } from '../../services/PresentationDirector';



import { FileSystemService } from '../../services/FileSystemService';
import { DirectoryNode } from '../../entities/filesystem/DirectoryNode';

export class CpCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.MODIFY];
    public readonly utility = 'cp';

    constructor(private fsService: FileSystemService) { super(); }

    public getMetadata(): CommandMetadata {
        return {
            verb: TheatricalVerb.SYNTHESIZE,
            style: 'NORMAL'
        };
    }

    executeInternal(args: string[], flags: Set<string>, operands: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const fsService = context.fileSystemService || this.fsService;
        const recursive = flags.has('r') || flags.has('R');

        if (operands.length < 2) {
            return {
                output: 'cp: missing file operand',
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
                output: `cp: target '${destination}' is not a directory`,
                newState: state,
                exitCode: 1
            };
        }

        for (const source of sources) {
            const srcPath = fsService.resolveAbsolutePath(source, state.currentDirectory);
            const srcNode = fsService.resolve(srcPath);

            if (!srcNode) {
                return {
                    output: `cp: cannot stat '${source}': No such file or directory`,
                    newState: state,
                    exitCode: 1
                };
            }

            const srcIsDir = fsService.isDirectory(srcNode);

            if (srcIsDir) {
                if (!recursive) {
                    return {
                        output: `cp: -r not specified; omitting directory '${source}'`,
                        newState: state,
                        exitCode: 1
                    };
                }

                try {
                    let finalDest = destPath;
                    if (destIsDir) {
                        finalDest = destPath === '/' ? `/${srcNode.name}` : `${destPath}/${srcNode.name}`;
                    }

                    this.copyRecursive(srcPath, finalDest, fsService);
                } catch (e: any) {
                    return {
                        output: `cp: error copying '${source}': ${e.message}`,
                        newState: state,
                        exitCode: 1
                    };
                }

            } else {
                try {
                    let finalDest = destPath;
                    if (destIsDir) {
                        finalDest = destPath === '/' ? `/${srcNode.name}` : `${destPath}/${srcNode.name}`;
                    }

                    const content = fsService.readFile(srcPath);
                    fsService.writeFile(finalDest, content, 'w');
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

    private copyRecursive(srcPath: string, destPath: string, fsService: FileSystemService) {
        if (!fsService.resolve(destPath)) {
            fsService.mkdir(destPath, 0o755);
        }

        const srcNode = fsService.resolve(srcPath);
        if (!srcNode || !fsService.isDirectory(srcNode)) return;

        const children = Array.from((srcNode as DirectoryNode).children.values());
        for (const child of children) {
            const childSrcPath = srcPath === '/' ? `/${child.name}` : `${srcPath}/${child.name}`;
            const childDestPath = destPath === '/' ? `/${child.name}` : `${destPath}/${child.name}`;

            if (fsService.isDirectory(child)) {
                this.copyRecursive(childSrcPath, childDestPath, fsService);
            } else {
                const content = fsService.readFile(childSrcPath);
                fsService.writeFile(childDestPath, content, 'w');
            }
        }
    }
}