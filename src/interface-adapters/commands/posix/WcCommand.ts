import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../../domain/entities/TerminalState';

interface WcOptions {
    lines: boolean; // -l
    words: boolean; // -w
    bytes: boolean; // -c
    chars: boolean; // -m
    files: string[];
}

export class WcCommand implements ICommand {
    name = 'wc';
    description = 'Print newline, word, and byte counts for each file';

    constructor(/* private fs: FileSystemService */) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        const options = this.parseArgs(args);

        // Default behavior: -l -w -c if no flags specified
        if (!options.lines && !options.words && !options.bytes && !options.chars) {
            options.lines = true;
            options.words = true;
            options.bytes = true;
        }

        const outputLines: string[] = [];
        let totalLines = 0;
        let totalWords = 0;
        let totalBytes = 0;
        let totalChars = 0;
        let exitCode = 0;

        // If no files, read from stdin (simulated)
        if (options.files.length === 0) {
            if (context.stdin !== undefined) {
                const result = this.countStats(context.stdin);
                outputLines.push(this.formatOutput(result, '', options));
            } else {
                // In a real shell this would block waiting for input. 
                // Here we just return empty or 0s.
                // Let's treat it as empty input.
                outputLines.push(this.formatOutput({ lines: 0, words: 0, bytes: 0, chars: 0 }, '', options));
            }
        } else {
            for (const file of options.files) {
                const node = context.fileSystemService.resolve(file, context.cwd);
                if (!node) {
                    outputLines.push(`wc: ${file}: No such file or directory`);
                    exitCode = 1;
                    continue;
                }
                if (context.fileSystemService.isDirectory(node)) {
                    outputLines.push(`wc: ${file}: Is a directory`);
                    // wc usually prints 0 0 0 for dir
                    outputLines.push(this.formatOutput({ lines: 0, words: 0, bytes: 0, chars: 0 }, file, options));
                    exitCode = 1; // It technically errors but continues
                    continue;
                }

                const inode = context.fileSystemService.getInode(node.inodeId);
                const content = (inode && typeof inode.content === 'string') ? inode.content : '';
                const result = this.countStats(content);

                totalLines += result.lines;
                totalWords += result.words;
                totalBytes += result.bytes;
                totalChars += result.chars;

                outputLines.push(this.formatOutput(result, file, options));
            }

            // Print total if more than 1 file
            if (options.files.length > 1) {
                outputLines.push(this.formatOutput({
                    lines: totalLines,
                    words: totalWords,
                    bytes: totalBytes,
                    chars: totalChars
                }, 'total', options));
            }
        }

        return {
            output: outputLines.join('\n'),
            exitCode: exitCode
        };
    }

    private parseArgs(args: string[]): WcOptions {
        const options: WcOptions = {
            lines: false,
            words: false,
            bytes: false,
            chars: false,
            files: []
        };

        for (const arg of args) {
            if (arg.startsWith('-') && arg.length > 1) {
                for (let j = 1; j < arg.length; j++) {
                    const char = arg[j];
                    switch (char) {
                        case 'l': options.lines = true; break;
                        case 'w': options.words = true; break;
                        case 'c': options.bytes = true; break;
                        case 'm': options.chars = true; break;
                    }
                }
            } else {
                options.files.push(arg);
            }
        }
        return options;
    }

    private countStats(content: string) {
        // Lines: count newlines
        // POSIX wc counts newlines, so "foo" is 0 lines, "foo\n" is 1.
        // JS split gives n+1 parts for n separators.
        // However, usually we want lines of text. 
        // Let's mimic `wc`: `echo -n "hi" | wc -l` -> 0. `echo "hi" | wc -l` -> 1.
        let lines = 0;
        for (let i = 0; i < content.length; i++) {
            if (content[i] === '\n') lines++;
        }

        // Words: split by whitespace and filter empty
        const words = content.trim().length === 0 ? 0 : content.trim().split(/\s+/).length;

        // Chars: JS length (UTF-16 code units usually, but close enough to chars for now)
        const chars = content.length;

        // Bytes: TextEncoder for UTF-8 byte length
        // We assume simple encoder if TextEncoder not available in this env, but sim usually has it.
        // Fallback: length (ascii) or simplistic check
        let bytes = chars;
        try {
            bytes = new TextEncoder().encode(content).length;
        } catch (e) {
            // Fallback for environment without TextEncoder
            // bytes = Buffer.byteLength(content, 'utf8');
            bytes = chars; // Approximate fallback
        }

        return { lines, words, bytes, chars };
    }

    private formatOutput(stats: { lines: number, words: number, bytes: number, chars: number }, label: string, options: WcOptions): string {
        const parts: string[] = [];
        // Standard order: lines, words, bytes/chars
        // Display is padded usually, but here simple spacing
        const pad = (n: number) => n.toString().padStart(4);

        if (options.lines) parts.push(pad(stats.lines));
        if (options.words) parts.push(pad(stats.words));
        if (options.bytes) parts.push(pad(stats.bytes));
        if (options.chars) parts.push(pad(stats.chars));

        if (label) parts.push(label);

        return parts.join(' ');
    }
}
