import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class UniqCommand implements ICommand {
    name = 'uniq';
    description = 'Report or omit repeated lines';

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
            if (!node) return { output: `uniq: ${target}: No such file or directory`, exitCode: 1 };
            const inode = context.fileSystemService.getInode(node.inodeId);
            content = (inode && typeof inode.content === 'string') ? inode.content : '';
        }

        const lines = content.split('\n');
        const uniqueLines: string[] = [];

        // uniq only filters ADJACENT duplicates by default
        if (lines.length > 0) {
            uniqueLines.push(lines[0]);
            for (let i = 1; i < lines.length; i++) {
                if (lines[i] !== lines[i - 1]) {
                    uniqueLines.push(lines[i]);
                }
            }
        }

        return {
            output: uniqueLines.join('\n'),
            exitCode: 0
        };
    }
}
