import { ICommand, CommandResponse } from '../../domain/entities/Command';
import { FileSystem, FSNode } from '../../domain/entities/FileSystem';
import { ProcessContext } from '../../domain/entities/ProcessContext';
import { TerminalState } from '../../domain/entities/TerminalState';

export class LSCommand implements ICommand {
    name = 'ls';
    description = 'List directory contents';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        let showDetails = false;
        let targetPath = context.cwd;

        // Parse args
        const targets = [];
        for (const arg of args) {
            if (arg === '-l') {
                showDetails = true;
            } else if (!arg.startsWith('-')) {
                targets.push(arg);
            }
        }

        if (targets.length > 0) {
            targetPath = targets[0];
        }

        const node = this.fs.resolveNode(targetPath, context.cwd);

        if (!node) {
            return {
                output: `ls: cannot access '${targetPath}': No such file or directory`,
                exitCode: 1
            };
        }

        if (node.type === 'file') {
            return {
                output: showDetails ? this.formatDetail(node) : node.name,
                exitCode: 0
            };
        }

        if (node.children) {
            // Explicitly cast or type the array to avoid 'unknown' error in strict mode
            const files = Object.values(node.children) as FSNode[];

            if (showDetails) {
                const output = files.map(f => this.formatDetail(f)).join('\n');
                return { output, exitCode: 0 };
            } else {
                const output = files.map(f => f.name).join('  ');
                return { output, exitCode: 0 };
            }
        }

        return { output: '', exitCode: 0 };
    }

    private formatDetail(node: FSNode): string {
        const typeChar = node.type === 'directory' ? 'd' : '-';
        // Mock size for now (content string length)
        const size = node.content ? node.content.length : 0;
        // Mock hard links (1)
        const links = 1;
        // Format date (simplified)
        const date = node.updatedAt.substring(0, 16).replace('T', ' ');

        return `${typeChar}${node.permissions} ${links} ${node.owner} ${size.toString().padStart(4)} ${date} ${node.name}`;
    }
}
