import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class CatCommand implements ICommand {
    name = 'cat';
    description = 'Concatenate files and print on the standard output';

    constructor(/* private fs: FileSystem */) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length === 0) {
            if (context.stdin !== undefined) {
                return { output: context.stdin, exitCode: 0 };
            }
            return { output: 'usage: cat <filename>', exitCode: 1 };
        }

        const target = args[0];
        try {
            // Check existence and type first for good error messages
            const node = context.fs.resolveNode(target, context.cwd);
            if (!node) {
                return { output: `cat: ${target}: No such file or directory`, exitCode: 1 };
            }

            if (context.fs.isDirectory(node)) {
                return { output: `cat: ${target}: Is a directory`, exitCode: 1 };
            }

            const raw = context.fs.readFile(target, context.cwd);
            const content = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
            return { output: content, exitCode: 0 };
        } catch (e: any) {
            return {
                output: `cat: ${e.message}`,
                exitCode: 1
            };
        }
    }
}
