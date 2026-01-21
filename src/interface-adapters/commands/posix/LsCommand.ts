import { ICommand, CommandResponse } from '../../../domain/commands/ICommand';
import { FileSystem, Dentry, S_IFDIR } from '../../../domain/entities/FileSystem';
import { FileSystemService } from '../../../domain/services/FileSystemService';
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

    constructor(private service: FileSystemService) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
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
                // Use FileSystemService
                const node = context.fileSystemService.resolve(targetPath, context.cwd);
                if (!node) {
                    outputLines.push(`ls: cannot access '${targetPath}': No such file or directory`);
                    exitCode = 1;
                    continue;
                }

                if (context.fileSystemService.isDirectory(node)) {
                    // List directory content
                    this.listDirectory(context.fileSystemService, node, targetPath, options, outputLines, printHeader);
                } else {
                    // File: list it directly
                    outputLines.push(this.formatItem(context.fileSystemService, node, options));
                }

            } catch (e: any) {
                outputLines.push(`ls: ${e.message}`);
                exitCode = 1;
            }
        }

        return {
            output: outputLines.join('\n'),
            exitCode: exitCode,
            newState: state
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

    private listDirectory(service: FileSystemService, node: Dentry, path: string, options: LsOptions, outputLines: string[], printHeader: boolean) {
        if (printHeader) {
            if (outputLines.length > 0) outputLines.push('');
            outputLines.push(`${path}:`);
        }

        const inode = service.getInode(node.inodeId);
        if (!inode) return;

        let files: Dentry[] = Array.from(node.children.values());

        // Filter hidden
        if (!options.all) {
            files = files.filter(f => !f.name.startsWith('.'));
        }

        // Sort (alphabetical default)
        files.sort((a, b) => a.name.localeCompare(b.name));

        if (files.length === 0) return;

        if (options.longFormat) {
            for (const file of files) {
                outputLines.push(this.formatDetail(service, file, options));
            }
        } else {
            if (options.oneLine) {
                for (const file of files) {
                    outputLines.push(this.formatItem(service, file, options));
                }
            } else {
                // Space separated
                const items = files.map(f => this.formatItem(service, f, options));
                outputLines.push(items.join('  '));
            }
        }

        // Recursive: Process subdirectories
        if (options.recursive) {
            for (const file of files) {
                if (service.isDirectory(file)) {
                    const subPath = path.endsWith('/') ? `${path}${file.name}` : `${path}/${file.name}`;
                    if (file.name !== '.' && file.name !== '..') {
                        this.listDirectory(service, file, subPath, options, outputLines, true);
                    }
                }
            }
        }
    }

    private formatDetail(service: FileSystemService, node: Dentry, options: LsOptions): string {
        const inode = service.getInode(node.inodeId);
        if (!inode) return `? ? ? ${node.name}`;

        const isDir = (inode.mode & S_IFDIR) !== 0;
        const typeChar = isDir ? 'd' : '-';
        const size = inode.size.toString().padStart(4);
        const date = new Date(inode.mtime).toISOString().substring(0, 16).replace('T', ' '); // YYYY-MM-DD HH:MM

        let permissions = '';
        // Decode mode to rwx string
        const perms = inode.mode & 0o777;
        permissions += (perms & 0o400) ? 'r' : '-';
        permissions += (perms & 0o200) ? 'w' : '-';
        permissions += (perms & 0o100) ? 'x' : '-';
        permissions += (perms & 0o040) ? 'r' : '-';
        permissions += (perms & 0o020) ? 'w' : '-';
        permissions += (perms & 0o010) ? 'x' : '-';
        permissions += (perms & 0o004) ? 'r' : '-';
        permissions += (perms & 0o002) ? 'w' : '-';
        permissions += (perms & 0o001) ? 'x' : '-';

        // Helper to get owner name from uid lookup? For now assuming fixed names or raw ID
        const owner = inode.uid === 0 ? 'root' : 'operator';

        let name = node.name;
        if (options.classify) {
            if (isDir) name += '/';
            else if (inode.mode & 0o111) name += '*';
        }

        return `${typeChar}${permissions} ${inode.links} ${owner} ${size} ${date} ${name}`;
    }

    private formatItem(service: FileSystemService, node: Dentry, options: LsOptions): string {
        let name = node.name;
        if (options.classify) {
            const inode = service.getInode(node.inodeId);
            if (inode) {
                if (inode.mode & S_IFDIR) name += '/';
                else if (inode.mode & 0o111) name += '*';
            }
        }
        return name;
    }
}
