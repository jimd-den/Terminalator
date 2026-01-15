import { ICommand, CommandResponse } from '../../domain/entities/Command';
import { FileSystem } from '../../domain/entities/FileSystem';
import { ProcessContext } from '../../domain/entities/ProcessContext';
import { TerminalState } from '../../domain/entities/TerminalState';

export class LSCommand implements ICommand {
    name = 'ls';
    description = 'List directory contents';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        // ls [path]
        const targetPath = args[0] || context.cwd;
        const node = this.fs.resolveNode(targetPath, context.cwd);

        if (!node) {
            return {
                output: `ls: cannot access '${targetPath}': No such file or directory`,
                exitCode: 1
            };
        }

        if (node.type === 'file') {
            return { output: node.name, exitCode: 0 };
        }

        if (!node.children || Object.keys(node.children).length === 0) {
            return { output: '', exitCode: 0 };
        }

        const files = Object.values(node.children).map(child => {
            if (child.type === 'directory') return child.name + '/';
            return child.name;
        });

        // Simple column formatting could be added here, but space separated is fine for now
        return {
            output: files.join('  '),
            exitCode: 0
        };
    }
}
