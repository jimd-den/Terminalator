import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class RmdirCommand implements ICommand {
    name = 'rmdir';
    description = 'Remove empty directories';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length === 0) {
            return {
                output: 'rmdir: missing operand',
                exitCode: 1
            };
        }

        const target = args[0];
        const node = this.fs.resolveNode(target, context.cwd);

        if (!node) {
            return {
                output: `rmdir: failed to remove '${target}': No such file or directory`,
                exitCode: 1
            };
        }

        if (node.type !== 'directory') {
            return {
                output: `rmdir: failed to remove '${target}': Not a directory`,
                exitCode: 1
            };
        }

        // Check if directory is empty
        if (node.children && Object.keys(node.children).length > 0) {
            return {
                output: `rmdir: failed to remove '${target}': Directory not empty`,
                exitCode: 1
            };
        }

        try {
            this.fs.deleteNode(target, context.cwd);
            return {
                output: '',
                exitCode: 0
            };
        } catch (error: any) {
            return {
                output: `rmdir: ${error.message}`,
                exitCode: 1
            };
        }
    }
}
