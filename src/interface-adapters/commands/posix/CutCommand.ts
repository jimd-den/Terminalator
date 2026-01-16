import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class CutCommand implements ICommand {
    name = 'cut';
    description = 'Remove sections from each line of files';

    constructor(private fs: FileSystem) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        let delimiter = '\t';
        let fields: number[] = [];
        let chars: number[][] = []; // [start, end] inclusive
        const files: string[] = [];

        // Simple arg parser
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === '-d') {
                delimiter = args[++i];
            } else if (arg.startsWith('-d')) {
                delimiter = arg.substring(2);
            } else if (arg === '-f') {
                fields = this.parseRange(args[++i]);
            } else if (arg.startsWith('-f')) {
                fields = this.parseRange(arg.substring(2));
            } else if (arg === '-c') {
                chars = this.parseCharRange(args[++i]);
            } else if (arg.startsWith('-c')) {
                chars = this.parseCharRange(arg.substring(2));
            } else {
                files.push(arg);
            }
        }

        if (fields.length === 0 && chars.length === 0) {
            return { output: 'cut: you must specify a list of bytes, characters, or fields', exitCode: 1 };
        }

        let content = '';
        if (files.length === 0) {
            content = context.stdin || '';
        } else {
            // Read all files
            for (const file of files) {
                const node = this.fs.resolveNode(file, context.cwd);
                if (!node || node.type !== 'file') {
                    // For simplicity, just append error or skip
                    // cut usually prints error
                    continue;
                }
                content += (node.content || '') + '\n';
            }
            // remove last newline if added from loop
            if (content.endsWith('\n')) content = content.slice(0, -1);
        }

        const lines = content.split('\n');
        const outputLines = lines.map(line => {
            if (chars.length > 0) {
                let res = '';
                // This is simplified. chars ranges.
                // We should iterate chars logic.
                // Note: cut -c 1-5 means chars 0-4.
                for (const range of chars) {
                    const start = range[0] > 0 ? range[0] - 1 : 0;
                    const end = range[1];
                    res += line.substring(start, end);
                }
                return res;
            } else {
                // Fields
                if (!line.includes(delimiter)) return line;
                const parts = line.split(delimiter);
                const selected = [];
                for (const f of fields) {
                    if (f >= 1 && f <= parts.length) {
                        selected.push(parts[f - 1]);
                    }
                }
                return selected.join(delimiter);
            }
        });

        return {
            output: outputLines.join('\n'),
            exitCode: 0
        };
    }

    private parseRange(str: string): number[] {
        // 1,3 or 1-3
        // Simplified parser
        return str.split(',').flatMap(s => {
            if (s.includes('-')) {
                const [start, end] = s.split('-').map(Number);
                const res = [];
                for (let i = start; i <= end; i++) res.push(i);
                return res;
            }
            return [Number(s)];
        });
    }

    private parseCharRange(str: string): number[][] {
        // 1-5,7 returns [[1,5], [7,7]]
        return str.split(',').map(s => {
            if (s.includes('-')) {
                const [start, end] = s.split('-').map(Number);
                return [start, end || 999999]; // handle 5- as to end?
            }
            const n = Number(s);
            return [n, n];
        });
    }
}
