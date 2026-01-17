/**
 * GrepCommand - Core Command
 *
 * Searches for patterns in files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows operater to find text in files.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem, Dentry, S_IFDIR } from '../../entities/FileSystem';

export class GrepCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const flags = args.filter(arg => arg.startsWith('-'));
        const cleanArgs = args.filter(arg => !arg.startsWith('-'));

        const recursive = flags.some(f => f.includes('r') || f.includes('R'));
        const caseInsensitive = flags.some(f => f.includes('i'));

        if (cleanArgs.length < 1) {
            return {
                output: 'usage: grep [-ri] <pattern> [file ...]',
                newState: state,
                exitCode: 2
            };
        }

        const pattern = cleanArgs[0];
        // Note: ShellParser already handles quote removal.

        const targets = cleanArgs.slice(1);

        let output = '';
        let exitCode = 1; // Default to 1 (no match)

        const lineMatches = (line: string): boolean => {
            if (caseInsensitive) {
                return line.toLowerCase().includes(pattern.toLowerCase());
            }
            return line.includes(pattern);
        };

        if (targets.length === 0) {
            // Check input
            if (input !== undefined) {
                const lines = input.split('\n');
                for (const line of lines) {
                    if (lineMatches(line)) {
                        output += line + '\n';
                        exitCode = 0;
                    }
                }
            } else {
                return { output: 'grep: missing input', newState: state, exitCode: 1 };
            }
        } else {
            // Process targets
            for (const target of targets) {
                let path = target;
                if (!path.startsWith('/')) {
                    path = state.currentDirectory === '/'
                        ? `/${target}`
                        : `${state.currentDirectory}/${target}`;
                }

                const node = this.fs.resolveNode(path);

                if (!node) {
                    output += `grep: ${target}: No such file or directory\n`;
                    // exitCode remains 1 if no matches found elsewhere? 
                    // usually grep continues but reports error.
                    continue;
                }

                const processNode = (currentNode: Dentry, currentPath: string, showFilename: boolean) => {
                    const inode = this.fs.getInode(currentNode.inodeId);
                    if (!inode) return;

                    if (inode.mode & S_IFDIR) {
                        if (recursive) {
                            for (const [name, child] of currentNode.children) {
                                const childPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
                                processNode(child, childPath, true);
                            }
                        } else {
                            output += `grep: ${currentPath}: Is a directory\n`;
                        }
                    } else {
                        // File
                        try {
                            const content = this.fs.readFile(currentPath);
                            const lines = content.split('\n');
                            for (const line of lines) {
                                if (lineMatches(line)) {
                                    exitCode = 0;
                                    if (showFilename) {
                                        output += `${currentPath}:${line}\n`;
                                    } else {
                                        output += `${line}\n`;
                                    }
                                }
                            }
                        } catch (e: any) {
                            output += `grep: ${currentPath}: ${e.message}\n`;
                        }
                    }
                };

                // If checking multiple files (or recursive), usually show filename.
                const showFilename = targets.length > 1 || recursive;
                processNode(node, path, showFilename);
            }
        }

        // Remove trailing newline if it wasn't there?
        // Standard grep outputs a newline after each match.
        // So valid output ends with newline.
        // We do NOT strip it.
        // if (output.endsWith('\n')) output = output.slice(0, -1);

        return {
            output: output,
            newState: state,
            exitCode: exitCode
        };
    }
}
