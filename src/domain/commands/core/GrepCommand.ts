import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * GrepCommand - Core Command
 *
 * This utility searches the input files, selecting lines matching one or more patterns.
 * It is designed to be POSIX compliant (IEEE Std 1003.1-2024).
 *
 * Pillar: The Four-Fold Shield (Strict Architecture) - Use Cases/Command
 * Pillar: The Balanced Scale (SOLID / KISS) - Strategy Pattern
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';
import { S_IFDIR } from '../../entities/FileSystem';
import { DirectoryNode } from '../../entities/filesystem/DirectoryNode';

/**
 * GrepOptions encapsulates the configuration.
 */
interface GrepOptions {
    extended: boolean;
    fixed: boolean;
    countOnly: boolean;
    listOnly: boolean;
    quiet: boolean;
    suppressErrors: boolean;
    caseInsensitive: boolean;
    lineNumbers: boolean;
    invertMatch: boolean;
    exactLine: boolean;
    recursive: boolean;
}

interface MatchingStrategy {
    match(line: string): boolean;
}

class BasicMatchingStrategy implements MatchingStrategy {
    private regexes: RegExp[];

    constructor(patterns: string[], options: GrepOptions) {
        const flags = options.caseInsensitive ? 'i' : '';
        this.regexes = patterns.map(p => {
            let finalPattern = p;
            if (options.exactLine) {
                finalPattern = `^${p}$`;
            }
            try {
                return new RegExp(finalPattern, flags);
            } catch (e) {
                return /.^/;
            }
        });
    }

    match(line: string): boolean {
        return this.regexes.some(re => re.test(line));
    }
}

class FixedStringStrategy implements MatchingStrategy {
    private patterns: string[];
    private caseInsensitive: boolean;
    private exactLine: boolean;

    constructor(patterns: string[], options: GrepOptions) {
        this.patterns = patterns;
        this.caseInsensitive = options.caseInsensitive;
        this.exactLine = options.exactLine;
    }

    match(line: string): boolean {
        const target = this.caseInsensitive ? line.toLowerCase() : line;
        return this.patterns.some(p => {
            const pattern = this.caseInsensitive ? p.toLowerCase() : p;
            if (this.exactLine) {
                return target === pattern;
            }
            return target.includes(pattern);
        });
    }
}

export class GrepCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.FILTER, CommandCapability.READ];
    public readonly utility = 'grep';

    constructor(private fs: FileSystemService) {
        super();
    }

    /**
     * Protocol: Build arguments programmatically.
     */
    public override buildArgs(requirements: Record<string, any>): string[] {
        const args: string[] = [];
        if (requirements.caseInsensitive) args.push('-i');
        if (requirements.recursive) args.push('-r');
        if (requirements.pattern) {
            args.push('-e', requirements.pattern);
        }
        if (requirements.path) args.push(requirements.path);
        return args;
    }

    protected override parseArgs(args: string[]) {
        // Grep options that take arguments: -e, -f
        super.parseArgs(args, ['e', 'f']);
    }

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        const fs = context.fileSystemService || this.fs;

        const options: GrepOptions = {
            extended: flags.has('E'),
            fixed: flags.has('F'),
            countOnly: flags.has('c'),
            listOnly: flags.has('l'),
            quiet: flags.has('q'),
            suppressErrors: flags.has('s'),
            caseInsensitive: flags.has('i'),
            lineNumbers: flags.has('n'),
            invertMatch: flags.has('v'),
            exactLine: flags.has('x'),
            recursive: flags.has('r') || flags.has('R')
        };

        const patterns: string[] = [];
        const targets: string[] = [];

        // Patterns from -e
        const eOptions = this.options.get('e');
        if (eOptions) patterns.push(eOptions);

        // Patterns from -f
        const fOptions = this.options.get('f');
        if (fOptions) {
            patterns.push(...this.readPatternsFromFile(fOptions, state, fs));
        }

        let opIndex = 0;
        if (patterns.length === 0 && operands.length > 0) {
            patterns.push(...operands[opIndex++].split('\n'));
        }

        while (opIndex < operands.length) {
            targets.push(operands[opIndex++]);
        }

        if (targets.length === 0 && input === undefined) {
            return { output: 'grep: missing input', newState: state, exitCode: 1 };
        }

        const strategy = options.fixed
            ? new FixedStringStrategy(patterns, options)
            : new BasicMatchingStrategy(patterns, options);

        const result = this.runGrep(targets, patterns, options, strategy, state, fs, input);

        return {
            output: result.output,
            newState: state,
            exitCode: result.exitCode
        };
    }

    private readPatternsFromFile(path: string, state: TerminalState, fs: FileSystemService): string[] {
        try {
            const content = fs.readFile(path, state.currentDirectory);
            return content.split('\n').filter(p => p.length > 0);
        } catch (e) {
            throw new Error(`could not read patterns from file ${path}`);
        }
    }

    private runGrep(targets: string[], patterns: string[], options: GrepOptions, strategy: MatchingStrategy, state: TerminalState, fs: FileSystemService, input?: string): { output: string, exitCode: number } {
        let output = '';
        let matchedOverall = false;
        let anyError = false;

        const showFilename = targets.length > 1 || options.recursive;

        const processRows = (content: string, filename: string): boolean => {
            const lines = content.split('\n');
            if (lines.length > 0 && lines[lines.length - 1] === '' && content.endsWith('\n')) {
                lines.pop();
            }

            let matchCount = 0;
            let fileMatched = false;

            for (let idx = 0; idx < lines.length; idx++) {
                const line = lines[idx];
                const matches = strategy.match(line);
                const selected = options.invertMatch ? !matches : matches;

                if (selected) {
                    fileMatched = true;
                    matchedOverall = true;
                    matchCount++;

                    if (options.quiet) return true;
                    if (options.listOnly) {
                        output += `${filename}\n`;
                        return true;
                    }
                    if (!options.countOnly) {
                        let prefix = '';
                        if (showFilename) prefix += `${filename}:`;
                        if (options.lineNumbers) prefix += `${idx + 1}:`;
                        output += `${prefix}${line}\n`;
                    }
                }
            }

            if (options.countOnly && !options.quiet) {
                let prefix = '';
                if (showFilename) prefix += `${filename}:`;
                output += `${prefix}${matchCount}\n`;
            }

            return fileMatched;
        };

        if (targets.length === 0 && input !== undefined) {
            processRows(input, '(standard input)');
        } else {
            for (const target of targets) {
                const processNode = (path: string) => {
                    try {
                        const node = fs.resolve(path, state.currentDirectory);
                        if (!node) {
                            if (!options.suppressErrors) {
                                output += `grep: ${path}: No such file or directory\n`;
                            }
                            anyError = true;
                            return;
                        }

                        const inode = fs.getInode(node.inodeId);
                        if (!inode) return;

                        if (inode.mode & S_IFDIR) {
                            if (options.recursive) {
                                for (const [name, child] of (node as DirectoryNode).children) {
                                    const childPath = path === '/' ? `/${name}` : `${path}/${name}`;
                                    processNode(childPath);
                                }
                            } else {
                                if (!options.suppressErrors) {
                                    output += `grep: ${path}: Is a directory\n`;
                                }
                                anyError = true;
                            }
                        } else {
                            const content = fs.readFile(path, state.currentDirectory);
                            processRows(content, path);
                        }
                    } catch (e: any) {
                        if (!options.suppressErrors) {
                            output += `grep: ${path}: ${e.message}\n`;
                        }
                        anyError = true;
                    }
                };

                processNode(target);
                if (options.quiet && matchedOverall) break;
            }
        }

        let exitCode = matchedOverall ? 0 : 1;
        if (anyError && !matchedOverall) exitCode = 2;

        return { output: options.quiet ? '' : output, exitCode };
    }
}