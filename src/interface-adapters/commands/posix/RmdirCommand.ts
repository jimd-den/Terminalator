import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class RmdirCommand implements ICommand {
    name = 'rmdir';
    description = 'Remove empty directories';

    constructor(/* private fs: FileSystemService */) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        if (args.length === 0) {
            return {
                output: 'rmdir: missing operand',
                exitCode: 1
            };
        }

        const target = args[0];
        const node = context.fileSystemService.resolve(target, context.cwd);

        if (!node) {
            return {
                output: `rmdir: failed to remove '${target}': No such file or directory`,
                exitCode: 1
            };
        }

        if (!context.fileSystemService.isDirectory(node)) {
            return {
                output: `rmdir: failed to remove '${target}': Not a directory`,
                exitCode: 1
            };
        }

        // Check if directory is empty
        if (node.children.size > 0) {
            return {
                output: `rmdir: failed to remove '${target}': Directory not empty`,
                exitCode: 1
            };
        }

        try {
            context.fileSystemService.deleteNode(target, context.cwd);
            return { output: '', exitCode: 0 };
        } catch (error: any) {
            return { output: `rmdir: ${error.message}`, exitCode: 1 };
        }
    }
}
