import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class TailCommand implements ICommand {
    name = 'tail';
    description = 'Output the last part of files';

    constructor(private fs: FileSystem) { }

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
                return { output: '', exitCode: 0 };
            }
        } else {
            const node = this.fs.resolveNode(filename, context.cwd);
            if (!node) return { output: `tail: cannot open '${filename}'`, exitCode: 1 };
            content = node.content || '';
        }

        const lines = content.split('\n');
        const start = Math.max(0, lines.length - n);
        return {
            output: lines.slice(start).join('\n'),
            exitCode: 0
        };
    }
}
