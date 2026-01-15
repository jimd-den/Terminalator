import { ICommand, CommandResponse } from '../../domain/entities/Command';
import { FileSystem } from '../../domain/entities/FileSystem';
import { ProcessContext } from '../../domain/entities/ProcessContext';
import { TerminalState } from '../../domain/entities/TerminalState';

export class GrepCommand implements ICommand {
    name = 'grep';
    description = 'Print lines matching a pattern';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length < 1) {
            return {
                output: 'Usage: grep <pattern> [filename]',
                exitCode: 1
            };
        }

        const pattern = args[0];
        let content = '';

        if (args.length === 1) {
            // Try stdin
            if (context.stdin !== undefined) {
                content = context.stdin;
            } else {
                return {
                    output: 'Usage: grep <pattern> [filename]',
                    exitCode: 1
                };
            }
        } else {
            const filename = args[1];
            const node = this.fs.resolveNode(filename, context.cwd);

            if (!node) {
                return {
                    output: `grep: ${filename}: No such file or directory`,
                    exitCode: 1
                };
            }

            if (node.type === 'directory') {
                return {
                    output: `grep: ${filename}: Is a directory`,
                    exitCode: 1
                };
            }
            content = node.content || '';
        }

        const lines = content.split('\n');
        // Basic substring match
        const matches = lines.filter(line => line.includes(pattern));

        return {
            output: matches.join('\n'),
            exitCode: matches.length > 0 ? 0 : 1
        };
    }
}
