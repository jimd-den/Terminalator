/**
 * RealpathCommand - Core Command
 *
 * Return the canonicalized absolute pathname.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Resolve paths to absolute.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class RealpathCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const files = args.filter(a => !a.startsWith('-'));
        if (files.length === 0) {
             return { output: 'realpath: missing operand', newState: state, exitCode: 1 };
        }

        const file = files[0];

        try {
            // resolvePath usually does normalization (../ etc).
            // FS uses `PathResolver` internally presumably.
            // My local `resolvePath` helper in commands does cwd + join.
            // Does it normalize?
            // "path normalization (ignoring redundant slashes)" is tested in POSIX suite.
            // But does it handle `..`?
            // `FileSystem.resolveNode` handles logic.
            // But we need the *string path*, not the node.
            // If FS facade doesn't expose `resolvePath` explicitly, we might need to rely on what we have.
            // However, `posix_suite` passed "Root parent is root" and "Path normalization".
            // So `fs` or the shell logic handles it.
            // Here we want to print the resolved path.

            // Re-implement path resolution using simple string manipulation if FS doesn't expose it?
            // Or assume `resolvePath` in this class should be smarter?
            // Currently `resolvePath` in commands is naive concatenation.
            // Let's make `RealpathCommand` smarter or assume FS has `getAbsolutePath`?
            // I'll implement a `normalize` function here for `realpath`.

            let absPath = this.resolvePath(file, state);
            absPath = this.normalize(absPath);

            // Check existence? POSIX realpath fails if components don't exist.
            const node = this.fs.resolveNode(absPath);
            if (!node) {
                return { output: `realpath: ${file}: No such file or directory`, newState: state, exitCode: 1 };
            }

            return {
                output: absPath,
                newState: state,
                exitCode: 0
            };

        } catch (e: any) {
            return { output: `realpath: ${file}: ${e.message}`, newState: state, exitCode: 1 };
        }
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }

    private normalize(path: string): string {
        const parts = path.split('/');
        const stack: string[] = [];
        for (const part of parts) {
            if (part === '' || part === '.') continue;
            if (part === '..') {
                if (stack.length > 0) stack.pop();
            } else {
                stack.push(part);
            }
        }
        return '/' + stack.join('/');
    }
}
