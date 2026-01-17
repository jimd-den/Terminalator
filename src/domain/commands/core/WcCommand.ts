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
import { FileSystem } from '../../entities/FileSystem';

export class WcCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        let countLines = false;
        let countWords = false;
        let countBytes = false;

        const files: string[] = [];

        for (const arg of args) {
            if (arg.startsWith('-')) {
                if (arg.includes('l')) countLines = true;
                if (arg.includes('w')) countWords = true;
                if (arg.includes('c')) countBytes = true;
            } else {
                files.push(arg);
            }
        }

        if (!countLines && !countWords && !countBytes) {
            countLines = true;
            countWords = true;
            countBytes = true;
        }

        let output = '';

        const processContent = (content: string, name?: string) => {
            const lines = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
            // wc counts newlines? "a\nb" is 1 line or 2? POSIX: "A line is a sequence... terminated by <newline>".
            // "a" has no newline. wc reports 0? 
            // Usually wc lines = count of \n.
            // "a\n" -> 1. "a" -> 0.
            // Let's stick to split - 1 if ends with newline?
            // Or just regex match \n.
            const actualLines = (content.match(/\n/g) || []).length;

            const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
            const bytes = content.length; // Approximate bytes = chars

            let part = '';
            if (countLines) part += ` ${actualLines}`;
            if (countWords) part += ` ${words}`;
            if (countBytes) part += ` ${bytes}`;
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
            for (const filename of files) {
                let path = filename;
                if (!path.startsWith('/')) {
                    path = state.currentDirectory === '/'
                        ? `/${filename}`
                        : `${state.currentDirectory}/${filename}`;
                }

                try {
                    const content = this.fs.readFile(path);
                    output += processContent(content, filename) + '\n';
                } catch (e: any) {
                    output += `wc: ${filename}: ${e.message}\n`;
                }
            }
            if (output.endsWith('\n')) output = output.slice(0, -1);
        }

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }
}
