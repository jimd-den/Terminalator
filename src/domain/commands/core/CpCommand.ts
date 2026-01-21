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

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

export class CpCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const flags = args.filter(arg => arg.startsWith('-'));
        const operands = args.filter(arg => !arg.startsWith('-'));
        const recursive = flags.some(f => f.includes('r') || f.includes('R'));

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
        let destPath = this.resolvePath(destination, state);
        const destNode = this.fs.resolve(destPath);
        const destIsDir = destNode ? this.fs.isDirectory(destNode) : destination.endsWith('/');

        // If multiple sources, dest MUST be a directory
        if (sources.length > 1 && destNode && !destIsDir) {
            return {
                output: `cp: target '${destination}' is not a directory`,
                newState: state,
                exitCode: 1
            };
        }

        for (const source of sources) {
            const srcPath = this.resolvePath(source, state);
            const srcNode = this.fs.resolve(srcPath);

            if (!srcNode) {
                return {
                    output: `cp: cannot stat '${source}': No such file or directory`,
                    newState: state,
                    exitCode: 1
                };
            }

            const srcIsDir = this.fs.isDirectory(srcNode);

            if (srcIsDir) {
                if (!recursive) {
                    return {
                        output: `cp: -r not specified; omitting directory '${source}'`,
                        newState: state,
                        exitCode: 1
                    };
                }

                // Recursive copy logic
                // If dest is dir, copy INTO it. 
                // If dest doesn't exist, create it as the copy.
                try {
                    // Determine actual target path
                    let finalDest = destPath;
                    if (destIsDir) {
                        // copying /src to /dest/src
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
                        // copying /file to /dest/file
                        finalDest = destPath === '/' ? `/${srcNode.name}` : `${destPath}/${srcNode.name}`;
                    }

                    const content = this.fs.readFile(srcPath);
                    // Write to new location
                    // If file exists, overwrite (unless interactive, but we assume forceful/standard)
                    // If destIsDir, we are writing into it. "finalDest" handles that.

                    // We need to 'create' or 'write'. fs.writeFile handles create or overwrite.
                    this.fs.writeFile(finalDest, content, 'w');

                    // Ideally verify permission bits copy too? 
                    // cp usually preserves mode if possible or applies umask.
                    // For now, basic content copy.
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

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }

    private copyRecursive(srcPath: string, destPath: string) {
        // Create destination directory
        // Check if exists?
        if (!this.fs.resolve(destPath)) {
            this.fs.mkdir(destPath, 0o755);
        }

        const srcNode = this.fs.resolve(srcPath);
        if (!srcNode || !this.fs.isDirectory(srcNode)) return; // Should catch earlier

        const children = Array.from(srcNode.children.values());
        for (const child of children) {
            const childSrcPath = srcPath === '/' ? `/${child.name}` : `${srcPath}/${child.name}`;
            const childDestPath = destPath === '/' ? `/${child.name}` : `${destPath}/${child.name}`;

            if (this.fs.isDirectory(child)) {
                this.copyRecursive(childSrcPath, childDestPath);
            } else {
                const content = this.fs.readFile(childSrcPath);
                this.fs.writeFile(childDestPath, content, 'w');
            }
        }
    }
}
