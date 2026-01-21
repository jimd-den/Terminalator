/**
 * FindCommand - Core Command
 *
 * Searches for files in a directory hierarchy.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to search for files matching specific criteria.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';
import { Dentry, S_IFDIR, S_IFREG, S_IFLNK } from '../../entities/FileSystem';

export class FindCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
        // Parse arguments
        // find [path...] [expression]
        // Example: find . -name "*.txt" -type f

        let paths: string[] = [];
        let expressionIndex = 0;

        // Separate path args from expression args
        // Arguments starting with '-' are expressions. Everything before first '-' is path?
        // Yes, usually.

        for (let i = 0; i < args.length; i++) {
            if (args[i].startsWith('-')) {
                expressionIndex = i;
                break;
            }
            paths.push(args[i]);
        }

        // If no expression args were found, all args are paths?
        // If args has no '-', then all are paths.
        // If args has '-', loop broke.
        if (expressionIndex === 0 && args.length > 0 && !args[0].startsWith('-')) {
            // Case: find path1 path2
            expressionIndex = args.length;
        } else if (expressionIndex === 0 && args.length > 0 && args[0].startsWith('-')) {
            // Case: find -name foo (implicit path .)
            paths = ['.'];
        }

        if (paths.length === 0) paths.push('.');

        // Parse Expression
        // Simplified parser: look for -name and -type
        let namePattern: string | null = null;
        let typeFilter: string | null = null;

        for (let i = expressionIndex; i < args.length; i++) {
            const arg = args[i];
            if (arg === '-name') {
                if (i + 1 < args.length) {
                    namePattern = args[++i];
                    // Strip quotes if present (simple shell simulation)
                    if ((namePattern.startsWith('"') && namePattern.endsWith('"')) ||
                        (namePattern.startsWith("'") && namePattern.endsWith("'"))) {
                        namePattern = namePattern.substring(1, namePattern.length - 1);
                    }
                } else {
                    return { output: 'find: missing argument to `-name`', newState: state, exitCode: 1 };
                }
            } else if (arg === '-type') {
                if (i + 1 < args.length) {
                    typeFilter = args[++i];
                } else {
                    return { output: 'find: missing argument to `-type`', newState: state, exitCode: 1 };
                }
            } else if (arg === '-print') {
                // Ignore, default behavior
            } else {
                return { output: `find: unknown predicate \`${arg}\``, newState: state, exitCode: 1 };
            }
        }

        const results: string[] = [];

        for (const path of paths) {
            let startPath = path;
            if (!startPath.startsWith('/')) {
                startPath = state.currentDirectory === '/'
                    ? `/${path}`
                    : `${state.currentDirectory}/${path}`;
            }

            // Resolve start node
            const startNode = this.fs.resolve(startPath);
            if (!startNode) {
                return { output: `find: \`${path}\`: No such file or directory`, newState: state, exitCode: 1 };
            }

            this.traverse(startNode, path, results, namePattern, typeFilter);
        }

        return {
            output: results.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private traverse(node: Dentry, currentPath: string, results: string[], namePattern: string | null, typeFilter: string | null) {
        // Evaluate filter for current node
        let match = true;
        const inode = this.fs.getInode(node.inodeId);

        if (!inode) return; // Should not happen

        // Name Check
        if (namePattern) {
            // Simple regex conversion for glob pattern
            // *.txt -> .*\.txt$
            // Escape dots?
            // Very basic implementation:
            // Support *
            const regexStr = '^' + namePattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$';
            const regex = new RegExp(regexStr);
            if (!regex.test(node.name)) {
                match = false;
            }
        }

        // Type Check
        if (match && typeFilter) {
            if (typeFilter === 'f' && !(inode.mode & S_IFREG)) match = false;
            else if (typeFilter === 'd' && !(inode.mode & S_IFDIR)) match = false;
            else if (typeFilter === 'l' && !(inode.mode & S_IFLNK)) match = false;
            // TODO: other types
        }

        if (match) {
            results.push(currentPath);
        }

        // Recursive Traversal
        if (inode.mode & S_IFDIR) {
            for (const [name, child] of node.children) {
                // Construct child path
                // If currentPath is just "foo", child is "foo/bar"
                // If currentPath is ".", child is "./bar"
                let childPath = currentPath.endsWith('/') ? `${currentPath}${name}` : `${currentPath}/${name}`;
                if (currentPath === '/') childPath = `/${name}`; // Root fix

                this.traverse(child, childPath, results, namePattern, typeFilter);
            }
        }
    }
}
