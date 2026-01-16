import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class HeadCommand implements ICommand {
    name = 'head';
    description = 'Output the first part of files';

    constructor(/* private fs: FileSystem */) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        let n = 10;
        let fileIndex = 0;

        // Simple arg parsing for -n
        if (args[0] === '-n' && args[1]) {
            n = parseInt(args[1], 10);
            fileIndex = 2;
        }

        const filename = args[fileIndex];
        let content = '';

        if (!filename) {
            // Try stdin
            if (context.stdin !== undefined) {
                content = context.stdin;
            } else {
                return { output: '', exitCode: 0 }; // Just wait? or empty
            }
        } else {
            const node = context.fs.resolveNode(filename, context.cwd);
            if (!node) return { output: `head: cannot open '${filename}'`, exitCode: 1 };

            if (context.fs.isDirectory(node)) {
                return { output: `head: error reading '${filename}': Is a directory`, exitCode: 1 };
            }

            const inode = context.fs.getInode(node.inodeId);
            content = (inode && typeof inode.content === 'string') ? inode.content : '';
        }

        const lines = content.split('\n');
        return {
            output: lines.slice(0, n).join('\n'),
            exitCode: 0
        };
    }
}
