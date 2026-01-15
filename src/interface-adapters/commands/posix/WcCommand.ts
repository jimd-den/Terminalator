import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class WcCommand implements ICommand {
    name = 'wc';
    description = 'Print newline, word, and byte counts';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        // Parse flags: -l (lines), -w (words), -c (bytes)
        // Default is all if no flags
        const flags = args.filter(a => a.startsWith('-'));
        const files = args.filter(a => !a.startsWith('-'));

        const showLines = flags.includes('-l') || flags.length === 0;
        const showWords = flags.includes('-w') || flags.length === 0;
        const showBytes = flags.includes('-c') || flags.length === 0;

        let content = '';
        let label = '';

        if (files.length === 0) {
            if (context.stdin !== undefined) {
                content = context.stdin;
            } else {
                return { output: 'wc: standard input: empty (simulated)', exitCode: 0 };
            }
        } else {
            // Only handle first file for simplicity in simulation
            const target = files[0];
            const node = this.fs.resolveNode(target, context.cwd);
            if (!node) return { output: `wc: ${target}: No such file or directory`, exitCode: 1 };
            if (node.type === 'directory') return { output: `wc: ${target}: Is a directory`, exitCode: 1 };
            content = node.content || '';
            label = target;
        }

        const lines = content.split('\n').length; // Approximation
        const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
        const bytes = content.length;

        const parts: string[] = [];
        if (showLines) parts.push(lines.toString());
        if (showWords) parts.push(words.toString());
        if (showBytes) parts.push(bytes.toString());
        if (label) parts.push(label);

        return {
            output: parts.join('\t'),
            exitCode: 0
        };
    }
}
