
import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class PasteCommand implements ICommand {
    name = 'paste';
    description = 'Merge lines of files';

    constructor(/* private fs: FileSystem */) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        let delimiter = '\t';
        const files: string[] = [];

        // Simple parsing
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '-d' && args[i + 1]) {
                delimiter = args[i + 1];
                i++;
            } else {
                files.push(args[i]);
            }
        }

        if (files.length === 0) {
            // Read from stdin?
            // Simplified: Error
            return { output: 'paste: missing file operand', exitCode: 1 };
        }

        const fileContents: string[][] = [];

        for (const file of files) {
            if (file === '-') {
                // Stdin
                fileContents.push((context.stdin || '').split('\n'));
            } else {
                const node = context.fs.resolveNode(file, context.cwd);
                if (!node || context.fs.isDirectory(node)) {
                    fileContents.push([]);
                    return { output: `paste: ${file}: No such file or directory`, exitCode: 1 };
                }
                const inode = context.fs.getInode(node.inodeId);
                const content = (inode && typeof inode.content === 'string') ? inode.content : '';
                fileContents.push(content.split('\n'));
            }
        }

        // Determine max lines
        const maxLines = Math.max(...fileContents.map(f => f.length));
        const outputLines: string[] = [];

        for (let i = 0; i < maxLines; i++) {
            const lineParts: string[] = [];
            for (const content of fileContents) {
                lineParts.push(content[i] || '');
            }
            outputLines.push(lineParts.join(delimiter));
        }

        return {
            output: outputLines.join('\n'),
            exitCode: 0
        };
    }
}
