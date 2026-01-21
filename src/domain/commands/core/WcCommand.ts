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
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

export class WcCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        let countLines = false;
        let countWords = false;
        let countBytes = false;
        let countChars = false;

        const files: string[] = [];

        for (const arg of args) {
            if (arg.startsWith('-') && arg !== '-') {
                if (arg.includes('l')) countLines = true;
                if (arg.includes('w')) countWords = true;
                if (arg.includes('c')) countBytes = true;
                if (arg.includes('m')) countChars = true;
            } else {
                files.push(arg);
            }
        }

        if (!countLines && !countWords && !countBytes && !countChars) {
            countLines = true;
            countWords = true;
            countBytes = true;
        }

        let output = '';

        let totalLines = 0;
        let totalWords = 0;
        let totalBytes = 0;
        let totalChars = 0;

        const processContent = (content: string, name?: string) => {
            const rawLines = content.split('\n');
            let actualLines = rawLines.length;
            if (content.length > 0 && content.endsWith('\n')) {
                actualLines--;
            }
            if (content.length === 0) actualLines = 0;

            const words = content.trim().length === 0 ? 0 : content.trim().split(/\s+/).length;
            const bytes = content.length;
            const chars = content.length;

            if (name) {
                totalLines += actualLines;
                totalWords += words;
                totalBytes += bytes;
                totalChars += chars;
            }

            let part = '';
            if (countLines) part += ` ${actualLines}`;
            if (countWords) part += ` ${words}`;
            if (countBytes) part += ` ${bytes}`;
            if (countChars) part += ` ${chars}`;
            if (name) part += ` ${name}`;

            return part.trimStart();
        };

        if (files.length === 0) {
            if (input !== undefined) {
                output = processContent(input);
            } else {
                return { output: 'wc: missing input', newState: state, exitCode: 1 };
            }
        } else {
            let exitCode = 0;
            for (const filename of files) {
                if (filename === '-') {
                    if (input !== undefined) {
                        output += processContent(input, '-') + '\n';
                    } else {
                        output += processContent('', '-') + '\n';
                    }
                    continue;
                }

                let path = filename;
                if (!path.startsWith('/')) {
                    path = state.currentDirectory === '/'
                        ? `/${filename}`
                        : `${state.currentDirectory}/${filename}`;
                }

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
                    const raw = this.fs.readFileBuffer(path);
                    const content = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
                    output += processContent(content, filename) + '\n';
                } catch (e: any) {
                    output += `wc: ${filename}: ${e.message}\n`;
                    exitCode = 1;
                }
            }

            if (files.length > 1) {
                let totalPart = '';
                if (countLines) totalPart += ` ${totalLines}`;
                if (countWords) totalPart += ` ${totalWords}`;
                if (countBytes) totalPart += ` ${totalBytes}`;
                if (countChars) totalPart += ` ${totalChars}`;
                totalPart += ` total`;
                output += totalPart.trimStart();
            } else {
                if (output.endsWith('\n')) output = output.slice(0, -1);
            }

            return {
                output: output,
                newState: state,
                exitCode: exitCode
            };
        }

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }
}
