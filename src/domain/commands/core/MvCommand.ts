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

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class MvCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const flags = args.filter(arg => arg.startsWith('-')); // -f, -i ignored for now
        const operands = args.filter(arg => !arg.startsWith('-'));

        if (operands.length < 2) {
            return {
                output: 'mv: missing file operand',
                newState: state,
                exitCode: 1
            };
        }

        const sources = operands.slice(0, operands.length - 1);
        const destination = operands[operands.length - 1];

        // Process destination similar to CP
        let destPath = this.resolvePath(destination, state);
        const destNode = this.fs.resolveNode(destPath);
        const destIsDir = destNode ? this.fs.isDirectory(destNode) : destination.endsWith('/');

        // If multiple sources, dest MUST be a directory
        if (sources.length > 1 && destNode && !destIsDir) {
            return {
                output: `mv: target '${destination}' is not a directory`,
                newState: state,
                exitCode: 1
            };
        }

        for (const source of sources) {
            const srcPath = this.resolvePath(source, state);
            const srcNode = this.fs.resolveNode(srcPath);

            if (!srcNode) {
                return {
                    output: `mv: cannot stat '${source}': No such file or directory`,
                    newState: state,
                    exitCode: 1
                };
            }

            try {
                // Determine target
                // fs.rename(old, new)
                // logic in fs.rename handles "renaming to foo in cwd" or "moving to exists"
                // But fs.rename implementation I saw earlier does:
                // if existing, delete it (overwrite).
                // It also handles moving /src to /dest/src if /dest is dir? 
                // Let's re-verify FS.rename logic.
                // FS.rename(302):
                // If existing (newPath), deletes it.
                // It does NOT auto-calculate "into directory" if newPath is a dir. 
                // It just deletes existing and moves there.
                // Wait. If I `mv file /dir`, and `/dir` exists, FS.rename will delete `/dir` and put `file` at `/dir`?
                // That is destructive and WRONG for posix "move into directory".
                // I must handle "into directory" logic here.

                let finalDest = destPath;
                if (destIsDir) {
                    finalDest = destPath === '/' ? `/${srcNode.name}` : `${destPath}/${srcNode.name}`;
                }

                // If finalDest is same as srcPath, do nothing or fail?
                if (srcPath === finalDest) {
                    return {
                        output: `mv: '${source}' and '${destination}' are the same file`,
                        newState: state,
                        exitCode: 1
                    };
                }

                this.fs.rename(srcPath, finalDest);

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

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
