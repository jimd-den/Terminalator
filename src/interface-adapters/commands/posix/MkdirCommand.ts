import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../../domain/entities/TerminalState';

interface MkdirOptions {
    directories: string[];
    parents: boolean; // -p
    mode?: string;    // -m (placeholder)
}

/**
 * MkdirCommand
 * 
 * Implements the POSIX `mkdir` utility.
 * 
 * Design:
 * - Supports `-p` (parents) for nested directory creation using iterative path resolution.
 * - Supports multiple path arguments.
 */
export class MkdirCommand implements ICommand {
    name = 'mkdir';
    description = 'Create directories';

    constructor(/* private fs: FileSystemService */) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        const options = this.parseArgs(args);

        if (options.directories.length === 0) {
            return { output: 'mkdir: missing operand', exitCode: 1 };
        }

        const outputLines: string[] = [];
        let exitCode = 0;

        for (const dirPath of options.directories) {
            try {
                if (options.parents) {
                    this.createParents(context.fs, dirPath, context.cwd);
                } else {
                    context.fileSystemService.mkdir(dirPath, 0o755, 1000, 1000, context.cwd);
                }
            } catch (e: any) {
                // If -p is specified, no error if existing directory
                if (options.parents && e.message.includes('File exists')) {
                    const node = context.fileSystemService.resolve(dirPath, context.cwd);
                    if (node && context.fileSystemService.isDirectory(node)) {
                        continue; // No error
                    }
                }
                outputLines.push(`mkdir: ${e.message}`);
                exitCode = 1;
            }
        }

        return {
            output: outputLines.join('\n'),
            exitCode: exitCode
        };
    }

    private parseArgs(args: string[]): MkdirOptions {
        const options: MkdirOptions = {
            directories: [],
            parents: false
        };

        for (const arg of args) {
            if (arg.startsWith('-') && arg.length > 1) {
                for (let j = 1; j < arg.length; j++) {
                    if (arg[j] === 'p') options.parents = true;
                    // -m ignore for now
                }
            } else {
                options.directories.push(arg);
            }
        }
        return options;
    }

    /**
     * Creates directory and its parents if -p is specified.
     */
    private createParents(fs: FileSystemService, path: string, cwd: string): void {
        // Resolve absolute path parts
        // If path is relative, prepend cwd
        let absolutePath = path.startsWith('/') ? path : (cwd === '/' ? `/${path}` : `${cwd}/${path}`);
        absolutePath = absolutePath.replace(/\/+/g, '/'); // Normalize slashes

        const parts = absolutePath.split('/').filter(p => p.length > 0);
        let currentPath = '';

        for (const part of parts) {
            currentPath += `/${part}`;

            // Check if exists
            const node = fs.resolve(currentPath);
            if (node) {
                if (!fs.isDirectory(node)) {
                    throw new Error(`cannot create directory '${path}': File exists`);
                }
                // already exists, continue
            } else {
                // Create
                // Use root as cwd for absolute path creation chunks
                fs.mkdir(currentPath, 0o755, 1000, 1000, '/');
            }
        }
    }
}
