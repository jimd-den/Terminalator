import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class SortCommand implements ICommand {
    name = 'sort';
    description = 'Sort lines of text files';

    constructor(/* private fs: FileSystemService */) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        const files = args.filter(a => !a.startsWith('-'));
        let content = '';

        if (files.length === 0) {
            if (context.stdin !== undefined) {
                content = context.stdin;
            } else {
                return { output: '', exitCode: 0 };
            }
        } else {
            const target = files[0];
            const node = context.fileSystemService.resolve(target, context.cwd);
            if (!node) return { output: `sort: ${target}: No such file or directory`, exitCode: 1 };
            const inode = context.fileSystemService.getInode(node.inodeId);
            content = (inode && typeof inode.content === 'string') ? inode.content : '';
        }

        const lines = content.split('\n');
        // Simple alphabetic sort
        lines.sort();

        return {
            output: lines.join('\n'),
            exitCode: 0
        };
    }
}
