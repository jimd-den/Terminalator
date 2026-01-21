/**
 * WcCommand - Core Command
 *
 * Word, line, character, and byte count.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to count text metrics.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

interface WcOptions {
    countLines: boolean;
    countWords: boolean;
    countBytes: boolean;
    countChars: boolean;
}

interface WcStats {
    lines: number;
    words: number;
    bytes: number;
    chars: number;
}

export class WcCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const { options, files } = this.parseArgs(args);

        let output = '';
        let exitCode = 0;

        const totalStats: WcStats = { lines: 0, words: 0, bytes: 0, chars: 0 };
        const processedFiles: number = files.length;

        if (files.length === 0) {
            // Process stdin
            if (context.stdin !== undefined) {
                const stats = this.processContent(context.stdin);
                output = this.formatOutput(stats, undefined, options);
            } else {
                return { output: 'wc: missing input', newState: state, exitCode: 1 };
            }
        } else {
            for (const filename of files) {
                if (filename === '-') {
                    const content = context.stdin || '';
                    const stats = this.processContent(content);
                    this.accumulateStats(totalStats, stats);
                    output += this.formatOutput(stats, '-', options) + '\n';
                    continue;
                }

                const path = this.resolvePath(filename, state);
                const node = this.fs.resolve(path);

                if (!node) {
                    output += `wc: ${filename}: No such file or directory\n`;
                    exitCode = 1;
                    continue;
                }

                if (this.fs.isDirectory(node)) {
                    output += `wc: ${filename}: Is a directory\n`;
                    output += ` 0 0 0 ${filename}\n`;
                    exitCode = 1;
                    continue;
                }

                try {
                    const content = this.readFileContent(path);
                    const stats = this.processContent(content);
                    this.accumulateStats(totalStats, stats);
                    output += this.formatOutput(stats, filename, options) + '\n';
                } catch (e: any) {
                    output += `wc: ${filename}: ${e.message}\n`;
                    exitCode = 1;
                }
            }

            if (processedFiles > 1) {
                output += this.formatOutput(totalStats, 'total', options);
            } else {
                // Trim trailing newline if single file output (standard wc convention varies, but test expects strictness)
                 if (output.endsWith('\n')) output = output.slice(0, -1);
            }
        }

        return {
            output: output,
            newState: state,
            exitCode: exitCode
        };
    }

    private parseArgs(args: string[]): { options: WcOptions, files: string[] } {
        const options: WcOptions = {
            countLines: false,
            countWords: false,
            countBytes: false,
            countChars: false
        };
        const files: string[] = [];
        let parsingFlags = true;

        // Track order for -c vs -m precedence (last wins)
        let lastByteOrCharFlag: 'c' | 'm' | null = null;

        for (const arg of args) {
            if (parsingFlags && arg.startsWith('-') && arg !== '-') {
                if (arg === '--') {
                    parsingFlags = false;
                    continue;
                }

                // Parse bundled flags e.g. -lw
                for (let i = 1; i < arg.length; i++) {
                    const char = arg[i];
                    if (char === 'l') options.countLines = true;
                    if (char === 'w') options.countWords = true;
                    if (char === 'c') {
                        options.countBytes = true;
                        lastByteOrCharFlag = 'c';
                    }
                    if (char === 'm') {
                        options.countChars = true;
                        lastByteOrCharFlag = 'm';
                    }
                }
            } else {
                files.push(arg);
            }
        }

        // Apply precedence: if both set, unset the earlier one
        if (lastByteOrCharFlag === 'c') {
            options.countChars = false;
            options.countBytes = true;
        } else if (lastByteOrCharFlag === 'm') {
            options.countBytes = false;
            options.countChars = true;
        }

        // Default behavior if no options specified (only if NONE were specified originally?
        // POSIX says "When any option is specified, wc shall report only the information requested".
        // But -c and -m are mutually exclusive in output slot.
        // If I say `wc -l`, it prints only lines.
        // If I say `wc` (no options), defaults to -lwc.
        if (!options.countLines && !options.countWords && !options.countBytes && !options.countChars) {
            options.countLines = true;
            options.countWords = true;
            options.countBytes = true;
        }

        return { options, files };
    }

    private processContent(content: string): WcStats {
        let lines = 0;
        for (let i = 0; i < content.length; i++) {
            if (content[i] === '\n') {
                lines++;
            }
        }

        const words = content.trim().length === 0 ? 0 : content.trim().split(/\s+/).length;

        // Bytes calculation (assuming UTF-8)
        const bytes = new TextEncoder().encode(content).length;

        // Chars calculation (code points)
        const chars = [...content].length;

        return { lines, words, bytes, chars };
    }

    private resolvePath(filename: string, state: TerminalState): string {
        if (filename.startsWith('/')) {
            return filename;
        }
        return state.currentDirectory === '/'
            ? `/${filename}`
            : `${state.currentDirectory}/${filename}`;
    }

    private readFileContent(path: string): string {
        const raw = this.fs.readFileBuffer(path);
        return typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
    }

    private accumulateStats(total: WcStats, current: WcStats): void {
        total.lines += current.lines;
        total.words += current.words;
        total.bytes += current.bytes;
        total.chars += current.chars;
    }

    private formatOutput(stats: WcStats, name: string | undefined, options: WcOptions): string {
        let part = '';
        if (options.countLines) part += ` ${stats.lines}`;
        if (options.countWords) part += ` ${stats.words}`;
        if (options.countBytes) part += ` ${stats.bytes}`;
        if (options.countChars) part += ` ${stats.chars}`;
        if (name) part += ` ${name}`;

        return part.trimStart();
    }
}
