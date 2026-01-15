import { ICommand, CommandResponse } from '../../domain/entities/Command';
import { FileSystem } from '../../domain/entities/FileSystem';
import { ProcessContext } from '../../domain/entities/ProcessContext';
import { TerminalState } from '../../domain/entities/TerminalState';

export class CatCommand implements ICommand {
    name = 'cat';
    description = 'Concatenate files and print on the standard output';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length === 0) {
            if (context.stdin !== undefined) {
                return { output: context.stdin, exitCode: 0 };
            }
            return { output: 'usage: cat <filename>', exitCode: 1 };
        }

        const target = args[0];
        const node = this.fs.resolveNode(target, context.cwd);

        if (!node) {
            return {
                output: `cat: ${target}: No such file or directory`,
                exitCode: 1
            };
        }

        if (node.type === 'directory') {
            return {
                output: `cat: ${target}: Is a directory`,
                exitCode: 1
            };
        }

        return {
            output: node.content || '',
            exitCode: 0
        };
    }
}
