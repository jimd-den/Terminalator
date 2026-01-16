import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
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

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const options = this.parseArgs(args);

        if (options.directories.length === 0) {
            return { output: 'mkdir: missing operand', exitCode: 1 };
        }

        const outputLines: string[] = [];
        let exitCode = 0;

        for (const dirPath of options.directories) {
            try {
                if (options.parents) {
                    this.createParents(dirPath, context.cwd);
                } else {
                    this.fs.createNode(dirPath, 'directory', context.cwd);
                    // POSIX mkdir is silent on success usually, only -v is verbose (not standard in older posix but common in GNU)
                    // But current implementation prints "Directory created". We should probably align with silent success for standard.
                    // But for user feedback in this game/terminal emulation, keeping feedback might be nice. 
                    // However, standard unix tools are silent. I'll stay silent on success to match 'grep', 'rm', 'cp' updates.
                }
            } catch (e: any) {
                // If -p is specified, no error if existing directory
                if (options.parents && e.message.includes('File exists')) {
                    const node = this.fs.resolveNode(dirPath, context.cwd);
                    if (node && node.type === 'directory') {
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
    private createParents(path: string, cwd: string): void {
        // Resolve absolute path parts
        // If path is relative, prepend cwd
        let absolutePath = path.startsWith('/') ? path : (cwd === '/' ? `/${path}` : `${cwd}/${path}`);
        absolutePath = absolutePath.replace(/\/+/g, '/'); // Normalize slashes

        const parts = absolutePath.split('/').filter(p => p.length > 0);
        let currentPath = '';

        for (const part of parts) {
            currentPath += `/${part}`;

            // Check if exists
            const node = this.fs.resolveNode(currentPath);
            if (node) {
                if (node.type !== 'directory') {
                    throw new Error(`cannot create directory '${path}': File exists`);
                }
                // already exists, continue
            } else {
                // Create
                // Use root as cwd for absolute path creation chunks
                this.fs.createNode(currentPath, 'directory', '/');
            }
        }
    }
}
