/**
 * GrepCommand - Core Command
 *
 * Searches for patterns in files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 * Pillar: The Watchman’s Log (Telemetry)
 *
 * Intent:
 * Allows operater to find text in files. Matches patterns against file content
 * or standard input, returning matching lines or counts.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem, Dentry, S_IFDIR } from '../../entities/FileSystem';
import { TelemetryPort } from '../../ports/TelemetryPort';

export class GrepCommand implements ICommand {
    constructor(
        private fs: FileSystem,
        private telemetry?: TelemetryPort
    ) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const executeLogic = () => {
            // Manual argument parsing loop for robustness
            const flags: Set<string> = new Set();
            const targets: string[] = [];
            let pattern: string | null = null;
            let endOfFlags = false;

            for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                if (!endOfFlags && arg.startsWith('-') && arg !== '-') {
                    if (arg === '--') {
                        endOfFlags = true;
                        continue;
                    }
                    // Handle combined flags e.g. -ri
                    for (let j = 1; j < arg.length; j++) {
                        flags.add(arg[j]);
                    }
                } else {
                    if (pattern === null) {
                        pattern = arg;
                    } else {
                        targets.push(arg);
                    }
                }
            }

            const recursive = flags.has('r') || flags.has('R');
            const caseInsensitive = flags.has('i');
            const invert = flags.has('v');
            const count = flags.has('c');
            const lineNum = flags.has('n');
            const listFiles = flags.has('l');

            if (pattern === null) {
                return {
                    output: 'usage: grep [-ri] <pattern> [file ...]',
                    newState: state,
                    exitCode: 2
                };
            }

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
                    // Handle trailing newline behavior: if file ends in newline, split gives empty string at end.
                    // POSIX grep usually ignores the empty string after the last newline.
                    if (i === lines.length - 1 && line === '' && content.endsWith('\n')) continue;

                    if (lineMatches(line)) {
                        matchedAny = true;
                        if (exitCode === 1) exitCode = 0; // Found match
                        matchCount++;

                        if (listFiles) {
                            output += `${filename || '(standard input)'}\n`;
                            return; // Listed, done with this file
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
                    // POSIX: reads from stdin (not supported interactively here yet, so error)
                    // Unless we consider no input as empty input?
                    // Usually grep hangs on stdin. Here we fail for now or use empty.
                    // "posix_suite" baseline behavior was to error if no input.
                    // But if piped, input is string.
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
                        // POSIX: "grep: <file>: No such file or directory"
                        // Exit code should be >1 if error occurred?
                        // POSIX: exit > 1 if error.
                        // But also 0 if match found elsewhere?
                        // "Exit status is 0 if any matches were found, 1 if no matches were found, and >1 if an error occurred."
                        output += `grep: ${target}: No such file or directory\n`;
                        if (exitCode !== 0) exitCode = 2; // Mark error, but don't overwrite success (0) if we want to be strict?
                        // Actually GNU grep returns 2 on error.
                        // If we already matched something (0), do we return 0 or 2?
                        // Generally 2 indicates trouble.
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
                                if (exitCode !== 0) exitCode = 2;
                            }
                        } else {
                            // File
                            try {
                                const content = this.fs.readFile(currentPath);
                                processContent(content, currentPath, showFilename);
                            } catch (e: any) {
                                output += `grep: ${currentPath}: ${e.message}\n`;
                                if (exitCode !== 0) exitCode = 2;
                            }
                        }
                    };

                    const showFilename = targets.length > 1 || recursive;
                    processNode(node, path, showFilename);
                }
            }

            return {
                output: output,
                newState: state,
                exitCode: exitCode
            };
        };

        if (this.telemetry) {
            return this.telemetry.trace('GrepCommand.execute', executeLogic, args);
        } else {
            return executeLogic();
        }
    }
}
