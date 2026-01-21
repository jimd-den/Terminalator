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
 * Design Pattern: Strategy
 * We use the Strategy pattern to decouple the matching logic (BRE, ERE, Fixed) from the 
 * file traversal and output formatting logic. This allows for easier extension and 
 * maintenance of various matching requirements.
 *
 * Design Pattern: Factory (Simple)
 * The `MatchingStrategyFactory` creates the appropriate strategy based on the command-line flags.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem, Dentry, S_IFDIR } from '../../entities/FileSystem';

/**
 * GrepOptions encapsulates the configuration parsed from command line arguments.
 */
interface GrepOptions {
    extended: boolean;      // -E
    fixed: boolean;         // -F
    countOnly: boolean;     // -c
    listOnly: boolean;      // -l
    quiet: boolean;         // -q
    suppressErrors: boolean; // -s
    caseInsensitive: boolean;// -i
    lineNumbers: boolean;   // -n
    invertMatch: boolean;   // -v
    exactLine: boolean;     // -x
    recursive: boolean;     // -r, -R
}

/**
 * MatchingStrategy defines the contract for various pattern matching algorithms.
 */
interface MatchingStrategy {
    match(line: string, patterns: string[]): boolean;
}

/**
 * BasicMatchingStrategy handles both BRE (Basic Regular Expressions) and ERE 
 * (Extended Regular Expressions) using JavaScript's built-in RegExp.
 * Note: While POSIX specifies BRE/ERE differences, JS RegExp is a hybrid that 
 * satisfies most requirements for this simulation.
 */
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
                // Return a regex that never matches if pattern is invalid
                // and we're not supposed to crash.
                return /.^/;
            }
        });
    }

    match(line: string): boolean {
        return this.regexes.some(re => re.test(line));
    }
}

/**
 * FixedStringStrategy handles -F option, matching patterns as literal strings.
 */
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

export class GrepCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    /**
     * Entry point for the grep command.
     */
    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const timestamp = new Date().toISOString();
        this.log(`[${timestamp}] GrepCommand.execute(args=${JSON.stringify(args)}, input=${input ? '(length ' + input.length + ')' : 'undefined'})`);

        try {
            const { options, patterns, targets } = this.parseArgs(args, state);

            // POSIX requirement: if no file operands, read standard input.
            if (targets.length === 0 && input === undefined) {
                return { output: 'grep: missing input', newState: state, exitCode: 1 };
            }

            const strategy = options.fixed
                ? new FixedStringStrategy(patterns, options)
                : new BasicMatchingStrategy(patterns, options);

            const result = this.runGrep(targets, patterns, options, strategy, state, input);

            this.log(`[${new Date().toISOString()}] GrepCommand.execute returns exitCode=${result.exitCode}`);
            return {
                output: result.output,
                newState: state,
                exitCode: result.exitCode
            };

        } catch (e: any) {
            this.log(`[${new Date().toISOString()}] GrepCommand.execute error: ${e.message}`);
            return {
                output: `grep: ${e.message}\n`,
                newState: state,
                exitCode: 2
            };
        }
    }

    /**
     * parseArgs extracts options, patterns, and target files from the argument list.
     */
    private parseArgs(args: string[], state: TerminalState): { options: GrepOptions, patterns: string[], targets: string[] } {
        const options: GrepOptions = {
            extended: false, fixed: false, countOnly: false, listOnly: false,
            quiet: false, suppressErrors: false, caseInsensitive: false,
            lineNumbers: false, invertMatch: false, exactLine: false, recursive: false
        };
        const patterns: string[] = [];
        const targets: string[] = [];

        let i = 0;
        while (i < args.length) {
            const arg = args[i];
            if (arg === '--') {
                i++;
                break;
            } else if (arg.startsWith('-') && arg.length > 1) {
                for (let j = 1; j < arg.length; j++) {
                    const char = arg[j];
                    switch (char) {
                        case 'E': options.extended = true; break;
                        case 'F': options.fixed = true; break;
                        case 'c': options.countOnly = true; break;
                        case 'l': options.listOnly = true; break;
                        case 'q': options.quiet = true; break;
                        case 's': options.suppressErrors = true; break;
                        case 'i': options.caseInsensitive = true; break;
                        case 'n': options.lineNumbers = true; break;
                        case 'v': options.invertMatch = true; break;
                        case 'x': options.exactLine = true; break;
                        case 'r':
                        case 'R': options.recursive = true; break;
                        case 'e':
                            if (j + 1 < arg.length) {
                                patterns.push(arg.substring(j + 1));
                                j = arg.length; // Skip rest of this arg
                            } else if (i + 1 < args.length) {
                                patterns.push(args[++i]);
                            } else {
                                throw new Error('option -e requires an argument');
                            }
                            break;
                        case 'f':
                            let patternFile: string;
                            if (j + 1 < arg.length) {
                                patternFile = arg.substring(j + 1);
                                j = arg.length;
                            } else if (i + 1 < args.length) {
                                patternFile = args[++i];
                            } else {
                                throw new Error('option -f requires an argument');
                            }
                            patterns.push(...this.readPatternsFromFile(patternFile, state));
                            break;
                        default:
                            // Ignore unknown flags for robustness
                            break;
                    }
                }
            } else {
                break;
            }
            i++;
        }

        // If no patterns specified via -e or -f, the first operand is the pattern_list.
        if (patterns.length === 0 && i < args.length) {
            patterns.push(...args[i++].split('\n'));
        }

        // Remaining arguments are files.
        while (i < args.length) {
            targets.push(args[i++]);
        }

        return { options, patterns, targets };
    }

    private readPatternsFromFile(path: string, state: TerminalState): string[] {
        try {
            const content = this.fs.readFile(path, state.currentDirectory);
            return content.split('\n').filter(p => p.length > 0);
        } catch (e) {
            throw new Error(`could not read patterns from file ${path}`);
        }
    }

    /**
     * runGrep performs the actual searching across targets.
     */
    private runGrep(targets: string[], patterns: string[], options: GrepOptions, strategy: MatchingStrategy, state: TerminalState, input?: string): { output: string, exitCode: number } {
        let output = '';
        let matchedOverall = false;
        let anyError = false;

        const showFilename = targets.length > 1 || options.recursive;

        const processRows = (content: string, filename: string): boolean => {
            const lines = content.split('\n');
            // Remove last empty line if file ends with newline
            if (lines.length > 0 && lines[lines.length - 1] === '' && content.endsWith('\n')) {
                lines.pop();
            }

            let matchCount = 0;
            let fileMatched = false;

            for (let idx = 0; idx < lines.length; idx++) {
                const line = lines[idx];
                const matches = strategy.match(line, patterns);
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
                        const node = this.fs.resolveNode(path, state.currentDirectory);
                        if (!node) {
                            if (!options.suppressErrors) {
                                output += `grep: ${path}: No such file or directory\n`;
                            }
                            anyError = true;
                            return;
                        }

                        const inode = this.fs.getInode(node.inodeId);
                        if (!inode) return;

                        if (inode.mode & S_IFDIR) {
                            if (options.recursive) {
                                for (const [name, child] of node.children) {
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
                            const content = this.fs.readFile(path, state.currentDirectory);
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

    private log(message: string) {
        // Observability hook
        // console.log(message);
    }
}
