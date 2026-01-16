import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

interface TailOptions {
    lines: number; // -n
    follow: boolean; // -f
    files: string[];
}

export class TailCommand implements ICommand {
    name = 'tail';
    description = 'Output the last part of files';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const options = this.parseArgs(args);
        const outputLines: string[] = [];
        let exitCode = 0;

        if (options.files.length === 0) {
            // Stdin
            if (context.stdin !== undefined) {
                const lines = context.stdin.split('\n');
                const start = Math.max(0, lines.length - options.lines);
                outputLines.push(...lines.slice(start));
            }
        } else {
            for (let i = 0; i < options.files.length; i++) {
                const file = options.files[i];
                // Header if multiple
                if (options.files.length > 1) {
                    outputLines.push(`==> ${file} <==`);
                }

                const node = this.fs.resolveNode(file, context.cwd);
                if (!node) {
                    outputLines.push(`tail: cannot open '${file}' for reading: No such file or directory`);
                    exitCode = 1;
                    continue;
                }

                const content = node.content || '';
                const lines = content.split('\n');
                const start = Math.max(0, lines.length - options.lines);
                outputLines.push(...lines.slice(start));

                if (options.files.length > 1 && i < options.files.length - 1) outputLines.push('');
            }
        }

        if (options.follow) {
            outputLines.push('tail: -f (follow) mode enabled. Polling... (simulated finish)');
            // Simulation: In a real app this would loop. 
            // We just note it was recognized.
        }

        return {
            output: outputLines.join('\n'),
            exitCode: exitCode
        };
    }

    private parseArgs(args: string[]): TailOptions {
        const options: TailOptions = {
            lines: 10,
            follow: false,
            files: []
        };

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === '-f') {
                options.follow = true;
            } else if (arg === '-n') {
                if (args[i + 1]) {
                    options.lines = parseInt(args[i + 1], 10);
                    i++;
                }
            } else if (arg.startsWith('-n')) {
                // handle -n10
                options.lines = parseInt(arg.substring(2), 10);
            } else {
                options.files.push(arg);
            }
        }
        return options;
    }
}
