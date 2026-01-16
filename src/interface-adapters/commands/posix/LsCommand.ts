import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem, FSNode } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

interface LsOptions {
    targets: string[];
    longFormat: boolean;  // -l
    all: boolean;         // -a
    classify: boolean;    // -F
    recursive: boolean;   // -R
    oneLine: boolean;     // -1 (implicit if piped, but explicit flag too)
}

/**
 * LsCommand
 * 
 * Implements the POSIX `ls` utility for listing directory contents.
 * 
 * Design:
 * - Supports recursive listing (-R).
 * - Supports hidden file inclusion (-a).
 * - Supports classification indicators (-F).
 * - Handles multiple operands.
 */
export class LsCommand implements ICommand {
    name = 'ls';
    description = 'List directory contents';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const options = this.parseArgs(args);

        // Default target is CWD if none specified
        if (options.targets.length === 0) {
            options.targets.push(context.cwd);
        }

        const outputLines: string[] = [];
        let exitCode = 0;

        // Process each target
        for (let i = 0; i < options.targets.length; i++) {
            const targetPath = options.targets[i];

            // If listing multiple directories, print header name
            const printHeader = options.targets.length > 1 || options.recursive;

            try {
                const node = this.fs.resolveNode(targetPath, context.cwd);
                if (!node) {
                    outputLines.push(`ls: cannot access '${targetPath}': No such file or directory`);
                    exitCode = 1;
                    continue;
                }

                if (node.type === 'file') {
                    outputLines.push(this.formatItem(node, options));
                } else if (node.type === 'directory') {
                    // List directory content
                    this.listDirectory(node, targetPath, options, outputLines, printHeader);
                }

            } catch (e: any) {
                outputLines.push(`ls: ${e.message}`);
                exitCode = 1;
            }
        }

        return {
            output: outputLines.join('\n'),
            exitCode: exitCode
        };
    }

    private parseArgs(args: string[]): LsOptions {
        const options: LsOptions = {
            targets: [],
            longFormat: false,
            all: false,
            classify: false,
            recursive: false,
            oneLine: false
        };

        for (const arg of args) {
            if (arg.startsWith('-') && arg.length > 1) {
                for (let j = 1; j < arg.length; j++) {
                    const char = arg[j];
                    switch (char) {
                        case 'l': options.longFormat = true; break;
                        case 'a': options.all = true; break;
                        case 'A': options.all = true; break; // Treat -A as -a for now
                        case 'F': options.classify = true; break;
                        case 'R': options.recursive = true; break;
                        case '1': options.oneLine = true; break;
                    }
                }
            } else {
                options.targets.push(arg);
            }
        }
        return options;
    }

    private listDirectory(node: FSNode, path: string, options: LsOptions, outputLines: string[], printHeader: boolean) {
        if (printHeader) {
            // Add newline separator if not first output, except logic is hard to track purely line-based.
            // Simple approach: Always print header for dir if multiple or recursive
            if (outputLines.length > 0) outputLines.push('');
            outputLines.push(`${path}:`);
        }

        if (!node.children) return;

        let files = Object.values(node.children);

        // Filter hidden
        if (!options.all) {
            files = files.filter(f => !f.name.startsWith('.'));
        }

        // Sort (alphabetical default)
        files.sort((a, b) => a.name.localeCompare(b.name));

        if (files.length === 0) return;

        if (options.longFormat) {
            for (const file of files) {
                outputLines.push(this.formatDetail(file, options));
            }
        } else {
            // Default list format (columns or one per line)
            // For simple terminal, one per line or space separated?
            // "ls" usually does columns. "ls -1" does one per line.
            // Let's do space separated for standard, newline for -1
            if (options.oneLine) {
                for (const file of files) {
                    outputLines.push(this.formatItem(file, options));
                }
            } else {
                // Space separated
                const items = files.map(f => this.formatItem(f, options));
                outputLines.push(items.join('  '));
            }
        }

        // Recursive: Process subdirectories
        if (options.recursive) {
            for (const file of files) {
                if (file.type === 'directory') {
                    const subPath = path.endsWith('/') ? `${path}${file.name}` : `${path}/${file.name}`;
                    // Recursive call
                    // Skip implicit '.' and '..' if we were to implement them as children (we don't here)
                    if (file.name !== '.' && file.name !== '..') {
                        this.listDirectory(file, subPath, options, outputLines, true);
                    }
                }
            }
        }
    }

    private formatDetail(node: FSNode, options: LsOptions): string {
        const typeChar = node.type === 'directory' ? 'd' : '-';
        const size = node.content ? node.content.length : 0;
        const links = 1; // Stub
        const date = node.updatedAt.substring(0, 16).replace('T', ' '); // YYYY-MM-DD HH:MM

        let name = node.name;
        if (options.classify) {
            if (node.type === 'directory') name += '/';
            else if (node.permissions.includes('x')) name += '*';
        }

        return `${typeChar}${node.permissions} ${links} ${node.owner} ${size.toString().padStart(4)} ${date} ${name}`;
    }

    /**
     * Formats a single item name with optional classifier.
     */
    private formatItem(node: FSNode, options: LsOptions): string {
        let name = node.name;
        if (options.classify) {
            if (node.type === 'directory') name += '/';
            // Executable check simplistic: if file and permissions contains x
            else if (node.permissions.includes('x')) name += '*';
        }
        return name;
    }
}
