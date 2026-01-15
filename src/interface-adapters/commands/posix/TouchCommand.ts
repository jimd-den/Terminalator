import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class TouchCommand implements ICommand {
    name = 'touch';
    description = 'Change file timestamps';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length === 0) {
            return { output: 'touch: missing file operand', exitCode: 1 };
        }

        const target = args[0];
        try {
            // Check if exists
            const node = this.fs.resolveNode(target, context.cwd);
            if (node) {
                // Update timestamp
                node.updatedAt = new Date().toISOString();
            } else {
                // Create empty file
                this.fs.createNode(target, 'file', context.cwd);
            }
            return { output: '', exitCode: 0 };
        } catch (e: any) {
            return { output: `touch: ${e.message}`, exitCode: 1 };
        }
    }
}
