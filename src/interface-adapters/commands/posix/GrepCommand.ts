import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem, FSNode } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

/**
 * GrepOptions
 * 
 * Encapsulates the configuration for the grep operation, parsed from command-line arguments.
 * This ensures the execution logic relies on a stable configuration object rather than raw args.
 */
interface GrepOptions {
    pattern: string;
    files: string[];
    ignoreCase: boolean;      // -i
    invertMatch: boolean;     // -v
    lineNumber: boolean;      // -n
    listFilesOnly: boolean;   // -l
    recursive: boolean;       // -r
    extendedRegex: boolean;   // -E (Treat pattern as RegExp)
}

/**
 * GrepCommand
 * 
 * Implements the POSIX `grep` utility for searching plain-text data sets for lines matching a regular expression.
 * 
 * Architecture Note:
 * This command follows the Single Responsibility Principle by sequestering argument parsing,
 * file traversal, and pattern matching into distinct, composable private methods.
 * 
 * Design Pattern:
 * We employ a simplified "Pipeline" approach where data flows from:
 * Args -> Configuration -> File Collection -> Line Matching -> Output Generation.
 */
export class GrepCommand implements ICommand {
    name = 'grep';
    description = 'Print lines matching a pattern';

    constructor(private fs: FileSystem) { }

    /**
     * Executes the grep command.
     * 
     * @param args Raw string arguments from the terminal.
     * @param context The process context (stdin, cwd, etc.).
     * @param state The current terminal state.
     * @returns A distinct CommandResponse with output or error code.
     */
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        // 1. Parse Arguments
        const options = this.parseArgs(args);

        if (!options.pattern) {
            return {
                output: 'Usage: grep [-ivnlrE] <pattern> [file...]',
                exitCode: 1
            };
        }

        // 2. Collect Targets
        // If no files specified, use stdin (unless recursive is implied on CWD, but POSIX grep requires files for -r usually, or CWD if explicit dot)
        // Standard grep reads stdin if no files.
        const sources: { name: string, content: string }[] = [];

        if (options.files.length === 0) {
            // Check for stdin
            if (context.stdin) {
                sources.push({ name: '(standard input)', content: context.stdin });
            } else if (options.recursive) {
                // If -r is supplied but no file, grep typically searches CWD.
                // We will treat this as "grep -r pattern ."
                options.files.push('.');
            } else {
                // Nothing to search
                return { output: '', exitCode: 1 };
            }
        }

        if (options.files.length > 0) {
            for (const filePath of options.files) {
                this.collectSources(filePath, options.recursive, context.cwd, sources);
            }
        }

        if (sources.length === 0 && !context.stdin) {
            // If collection resulted in nothing (e.g. removed files)
            return { output: '', exitCode: 1 };
        }

        // 3. Process Sources
        const outputLines: string[] = [];
        let matchCount = 0;

        for (const source of sources) {
            const result = this.searchSource(source, options, sources.length > 1);
            if (result) {
                outputLines.push(result);
                matchCount++;
            }
        }

        return {
            output: outputLines.join('\n'),
            exitCode: matchCount > 0 ? 0 : 1
        };
    }

    /**
     * Parses command line arguments into a structured GrepOptions object.
     * Manual parsing is used to ensure POSIX-like behavior without external dependencies.
     */
    private parseArgs(args: string[]): GrepOptions {
        const options: GrepOptions = {
            pattern: '',
            files: [],
            ignoreCase: false,
            invertMatch: false,
            lineNumber: false,
            listFilesOnly: false,
            recursive: false,
            extendedRegex: false
        };

        let patternsFound = false;

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            if (arg.startsWith('-') && arg.length > 1) {
                // Handle flags
                for (let j = 1; j < arg.length; j++) {
                    const char = arg[j];
                    switch (char) {
                        case 'i': options.ignoreCase = true; break;
                        case 'v': options.invertMatch = true; break;
                        case 'n': options.lineNumber = true; break;
                        case 'l': options.listFilesOnly = true; break;
                        case 'r': options.recursive = true; break;
                        case 'E': options.extendedRegex = true; break;
                        default: break; // Ignore unknown flags
                    }
                }
            } else {
                if (!patternsFound) {
                    options.pattern = arg;
                    patternsFound = true;
                } else {
                    options.files.push(arg);
                }
            }
        }

        return options;
    }

    /**
     * Recursively collects file content from the file system.
     * 
     * @param path The path to search (file or directory).
     * @param recursive Whether to descend into directories.
     * @param cwd Current working directory for resolution.
     * @param accumulator Array to store found matching files.
     */
    private collectSources(path: string, recursive: boolean, cwd: string, accumulator: { name: string, content: string }[]): void {
        try {
            const node = this.fs.resolveNode(path, cwd);
            if (!node) return; // Skip non-existent

            if (node.type === 'file') {
                accumulator.push({ name: path, content: node.content || '' });
            } else if (node.type === 'directory') {
                if (recursive) {
                    // Iterate children
                    if (node.children) {
                        for (const childName of Object.keys(node.children)) {
                            // Construct correct relative path for recursion
                            // Note: FSNode doesn't store full path, so we must build it.
                            // If path was '.', child is just 'childName'.
                            // If path was 'dir', child is 'dir/childName'.
                            const nextPath = path === '.' || path === './' ? childName : `${path}/${childName}`.replace('//', '/');
                            this.collectSources(nextPath, true, cwd, accumulator);
                        }
                    }
                } else {
                    // POSIX grep prints "Is a directory" if not recursive
                    // We'll skip silently or could log, but for now we follow simple behavior: ignore
                }
            }
        } catch (e) {
            // Ignore access errors
        }
    }

    /**
     * Performs the search on a single source content.
     */
    private searchSource(source: { name: string, content: string }, options: GrepOptions, printFilenames: boolean): string | null {
        const lines = source.content.split('\n');
        const matchedOutput: string[] = [];
        let hasMatch = false;

        // Prepare RegExp pattern
        // If not -E (extended), grep treats standard chars as literals, but we are in JS.
        // Construction of RegExp:
        // If -E is NOT set, we should escape special regex characters to treat pattern as literal string,
        // UNLESS the user *expects* basic regex. POSIX grep is Basic Regex by default.
        // For simplicity in this implementation:
        // - Default: Treat as partial string match (simplest 'grep').
        // - -E: Treat as RegExp.

        let regex: RegExp | null = null;
        if (options.extendedRegex) {
            try {
                const flags = options.ignoreCase ? 'i' : '';
                regex = new RegExp(options.pattern, flags);
            } catch (e) {
                return `grep: invalid regular expression`;
            }
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let match = false;

            if (regex) {
                match = regex.test(line);
            } else {
                // Basic string inclusion
                if (options.ignoreCase) {
                    match = line.toLowerCase().includes(options.pattern.toLowerCase());
                } else {
                    match = line.includes(options.pattern);
                }
            }

            // Apply Inversion (-v)
            if (options.invertMatch) {
                match = !match;
            }

            if (match) {
                hasMatch = true;

                // If -l (list files only), we can stop immediately at first match
                if (options.listFilesOnly) {
                    return source.name;
                }

                // Format Output
                let outputLine = line;

                // Prepend Line Number (-n)
                if (options.lineNumber) {
                    outputLine = `${i + 1}:${outputLine}`;
                }

                // Prepend Filename (if multiple files or recursive)
                // POSIX: print filename if more than one file input.
                if (printFilenames) {
                    outputLine = `${source.name}:${outputLine}`;
                }

                matchedOutput.push(outputLine);
            }
        }

        if (options.listFilesOnly) {
            return null; // No match found so return null
        }

        return matchedOutput.length > 0 ? matchedOutput.join('\n') : null;
    }
}
