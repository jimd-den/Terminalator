import { getStdinAsString } from '../../entities/ProcessContext';
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
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';
import { Dentry, S_IFDIR, S_IFREG, S_IFLNK } from '../../entities/FileSystem';

interface Predicate {
    evaluate(node: Dentry, path: string, fs: FileSystemService, context: ProcessContext, state: TerminalState, outputBuffer: string[]): Promise<boolean>;
    isAction(): boolean;
    type?: string;
    value?: any;
}

export class FindCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        let paths: string[] = [];
        let predicates: Predicate[] = [];
        let expressionIndex = -1;

        // 1. Identify start of expression (first arg starting with -)
        for (let i = 0; i < args.length; i++) {
            if (args[i].startsWith('-')) {
                expressionIndex = i;
                break;
            }
            paths.push(args[i]);
        }

        if (expressionIndex === -1 && paths.length > 0) {
            // Only paths, implicit print is added later
        } else if (expressionIndex === 0) {
            // No paths, implicit .
            paths = ['.'];
            expressionIndex = 0;
        } else if (expressionIndex === -1 && paths.length === 0) {
            // No args
            paths = ['.'];
        }

        if (paths.length === 0) paths.push('.');

        // 2. Parse Expression
        if (expressionIndex !== -1) {
            for (let i = expressionIndex; i < args.length; i++) {
                const arg = args[i];
                if (arg === '-name') {
                    if (i + 1 >= args.length) return this.error('missing argument to `-name`', state);
                    const pattern = args[++i];
                    predicates.push({
                        evaluate: async (node) => {
                            const regexStr = '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
                            return new RegExp(regexStr).test(node.name);
                        },
                        isAction: () => false
                    });
                } else if (arg === '-maxdepth') {
                    if (i + 1 >= args.length) return this.error('missing argument to `-maxdepth`', state);
                    const depth = parseInt(args[++i], 10);
                    if (isNaN(depth)) return this.error('invalid argument to `-maxdepth`', state);
                    predicates.push({
                        evaluate: async () => true, // Handled globally in traverse loop logic
                        isAction: () => false,
                        type: 'maxdepth',
                        value: depth
                    });
                } else if (arg === '-type') {
                    if (i + 1 >= args.length) return this.error('missing argument to `-type`', state);
                    const type = args[++i];
                    predicates.push({
                        evaluate: async (node) => {
                            const inode = this.fs.getInode(node.inodeId);
                            if (!inode) return false;
                            if (type === 'f') return (inode.mode & S_IFREG) !== 0;
                            if (type === 'd') return (inode.mode & S_IFDIR) !== 0;
                            if (type === 'l') return (inode.mode & S_IFLNK) !== 0;
                            return false;
                        },
                        isAction: () => false
                    });
                } else if (arg === '-print') {
                    predicates.push({
                        evaluate: async () => true,
                        isAction: () => true,
                        type: 'print'
                    });
                } else if (arg === '-prune') {
                    predicates.push({
                        evaluate: async () => true,
                        isAction: () => false,
                        type: 'prune'
                    });
                } else if (arg === '-exec') {
                    const execArgs: string[] = [];
                    i++;
                    while (i < args.length) {
                        if (args[i] === ';' || args[i] === '\\;') break;
                        execArgs.push(args[i]);
                        i++;
                    }
                    predicates.push({
                        evaluate: async (node, path, fs, ctx, st, outBuf) => {
                            const cmdArgs = execArgs.map(a => {
                                const val = a === '{}' ? path : a.replace(/{}/g, path);
                                // Simple single quoting for shell safety if arguments contain spaces or special chars
                                // We replace ' with '"'"' to handle internal single quotes
                                return `'${val.replace(/'/g, "'\"'\"'")}'`;
                            });
                            const cmdLine = cmdArgs.join(' ');
                            if (!ctx.executor) return false;

                            const res = await ctx.executor.execute(cmdLine, st);
                            if (res.output) outBuf.push(res.output);
                            return res.exitCode === 0;
                        },
                        isAction: () => true,
                        type: 'exec'
                    });
                } else {
                    return this.error(`unknown predicate \`${arg}\``, state);
                }
            }
        }

        // Implicit print
        if (!predicates.some(p => p.isAction())) {
            predicates.push({
                evaluate: async () => true,
                isAction: () => true,
                type: 'print'
            });
        }

        const results: string[] = [];

        let maxDepth = Infinity;
        const depthPred = predicates.find(p => p.type === 'maxdepth');
        if (depthPred && depthPred.value !== undefined) maxDepth = depthPred.value;

        for (const path of paths) {
            let startPath = path;
            if (!startPath.startsWith('/')) {
                startPath = state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
            }

            const node = this.fs.resolve(startPath);
            if (!node) return this.error(`\`${path}\`: No such file or directory`, state);

            await this.traverse(node, path, predicates, results, context, state, 0, maxDepth);
        }

        return {
            output: results.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private error(msg: string, state: TerminalState): CommandResponse {
        return { output: `find: ${msg}`, newState: state, exitCode: 1 };
    }

    private async traverse(
        node: Dentry,
        currentPath: string,
        predicates: Predicate[],
        output: string[],
        context: ProcessContext,
        state: TerminalState,
        currentDepth: number,
        maxDepth: number
    ) {
        if (currentDepth > maxDepth) return;

        let keepGoing = true;
        let pruned = false;

        for (const p of predicates) {
            if (!keepGoing) break;

            // Evaluate predicate
            // Note: maxdepth is checked via recursion limit, but its predicate "evaluate" returns true.
            const res = await p.evaluate(node, currentPath, this.fs, context, state, output);

            if (p.type === 'prune' && res) pruned = true;

            if (p.type === 'print' && res) {
                output.push(currentPath);
            }

            if (!res) keepGoing = false;
        }

        if (pruned) return;

        if (this.fs.isDirectory(node) && currentDepth < maxDepth) {
            // Sort children for deterministic output (optional but good for tests)
            const children = Array.from(node.children.entries()).sort((a, b) => a[0].localeCompare(b[0]));

            for (const [name, child] of children) {
                let childPath = currentPath.endsWith('/') ? `${currentPath}${name}` : `${currentPath}/${name}`;
                if (currentPath === '/') childPath = `/${name}`;
                await this.traverse(child, childPath, predicates, output, context, state, currentDepth + 1, maxDepth);
            }
        }
    }
}
