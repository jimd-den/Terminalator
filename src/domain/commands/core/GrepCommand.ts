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
        const invert = flags.some(f => f.includes('v'));
        const count = flags.some(f => f.includes('c'));
        const lineNum = flags.some(f => f.includes('n'));
        const listFiles = flags.some(f => f.includes('l'));

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

        let regex: RegExp;
        try {
            regex = new RegExp(pattern, caseInsensitive ? 'i' : '');
        } catch (e) {
            return {
                output: `grep: invalid pattern: ${pattern}`,
                newState: state,
                exitCode: 2
            };
        }

        const lineMatches = (line: string): boolean => {
            const match = regex.test(line);
            return invert ? !match : match;
        };

        const processContent = (content: string, filename: string | undefined, showLabel: boolean) => {
             const lines = content.split('\n');
             let matchCount = 0;
             let matchedAny = false;

             for (let i = 0; i < lines.length; i++) {
                 const line = lines[i];
                 if (i === lines.length - 1 && line === '' && content.endsWith('\n')) continue;

                 if (lineMatches(line)) {
                     matchedAny = true;
                     exitCode = 0;
                     matchCount++;

                     if (listFiles) {
                         output += `${filename || '(standard input)'}\n`;
                         return;
                     }

                     if (!count) {
                         let prefix = '';
                         if (showLabel && filename) prefix += `${filename}:`;
                         if (lineNum) prefix += `${i + 1}:`;

                         output += `${prefix}${line}\n`;
                     }
                 }
             }

             if (count && !listFiles) {
                 if (showLabel && filename) {
                     output += `${filename}:${matchCount}\n`;
                 } else {
                     output += `${matchCount}\n`;
                 }
             }
        };

        if (targets.length === 0) {
            // Check input
            if (input !== undefined) {
                processContent(input, undefined, false);
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
                    // If error, exit code 2 usually, but POSIX says >1.
                    // Let's keep 1 if no match found, 2 if syntax/error.
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
                            // We pass currentPath as filename.
                            // showFilename determines if we PREFIX output with it.
                            processContent(content, currentPath, showFilename);
                        } catch (e: any) {
                            output += `grep: ${currentPath}: ${e.message}\n`;
                        }
                    }
                };

                const showFilename = targets.length > 1 || recursive;
                processNode(node, path, showFilename);
            }
        }

        if (output.endsWith('\n')) output = output.slice(0, -1);

        return {
            output: output,
            newState: state,
            exitCode: exitCode
        };
    }
}
