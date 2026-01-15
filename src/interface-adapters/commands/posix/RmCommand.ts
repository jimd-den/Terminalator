import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem, FSNode } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class RmCommand implements ICommand {
    name = 'rm';
    description = 'Remove files or directories';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length === 0) {
            return { output: 'rm: missing operand', exitCode: 1 };
        }

        const target = args[0];
        const node = this.fs.resolveNode(target, context.cwd);

        if (!node) {
            return { output: `rm: cannot remove '${target}': No such file or directory`, exitCode: 1 };
        }

        // Basic check for recursive -r not implemented fully yet, maybe assume simple rm for now
        // Or if directory, fail unless -r (if we parser args deeply). 
        // For simplicity: rm works on files, rmdir on dirs, or rm works on both if simple.
        // Let's enforce directory check.

        if (node.type === 'directory') {
            // In posix rm needs -r. We'll simplify and say "Is a directory"
            return { output: `rm: cannot remove '${target}': Is a directory`, exitCode: 1 };
        }

        try {
            this.deleteNode(node);
            return { output: '', exitCode: 0 };
        } catch (e: any) {
            return { output: `rm: ${e.message}`, exitCode: 1 };
        }
    }

    private deleteNode(node: FSNode) {
        if (!node.parent || !node.parent.children) return; // Cannot delete root or orphan
        delete node.parent.children[node.name];
        // Note: Graph references might still exist if other things point to it, but parent link is cut.
    }
}
