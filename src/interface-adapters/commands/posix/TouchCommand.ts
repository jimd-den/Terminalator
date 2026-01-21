import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class TouchCommand implements ICommand {
    name = 'touch';
    description = 'Change file timestamps';

    constructor(/* private fs: FileSystemService */) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        if (args.length === 0) {
            return { output: 'touch: missing file operand', exitCode: 1 };
        }

        const target = args[0];
        try {
            // Check if exists
            const node = context.fileSystemService.resolve(target, context.cwd);
            if (node) {
                // Update timestamp
                const inode = context.fileSystemService.getInode(node.inodeId);
                if (inode) {
                    inode.mtime = Date.now();
                    inode.atime = Date.now();
                }
            } else {
                // Create empty file
                context.fileSystemService.createFile(target, 0o644, 1000, 1000, context.cwd);
            }
            return { output: '', exitCode: 0 };
        } catch (e: any) {
            return { output: `touch: ${e.message}`, exitCode: 1 };
        }
    }
}
