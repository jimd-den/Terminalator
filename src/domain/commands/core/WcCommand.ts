import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * WcCommand - Core Command
 *
 * Word, line, character, and byte count.
 *
 * Pillar: THE FOUR-FOLD SHIELD (Strict Architecture)
 * Pillar: THE Swift Stream (Performance)
 * Pillar: THE Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to count text metrics.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';

export class WcCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.READ, CommandCapability.FILTER];
    public readonly utility = 'wc';

    constructor(private fs: FileSystemService) {
        super();
    }

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        const fsService = context.fileSystemService || this.fs;

        let countLines = flags.has('l');
        let countWords = flags.has('w');
        let countBytes = flags.has('c');
        let countChars = flags.has('m');

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

        if (operands.length === 0) {
            if (input !== undefined) {
                output = processContent(input);
            } else {
                return { output: 'wc: missing input', newState: state, exitCode: 1 };
            }
        } else {
            let exitCode = 0;
            for (const filename of operands) {
                if (filename === '-') {
                    output += processContent(input || '', '-') + '\n';
                    continue;
                }

                let path = filename;
                if (!path.startsWith('/')) {
                    path = state.currentDirectory === '/'
                        ? `/${filename}`
                        : `${state.currentDirectory}/${filename}`;
                }

                const node = fsService.resolve(path);

                if (!node) {
                    output += `wc: ${filename}: No such file or directory\n`;
                    exitCode = 1;
                    continue;
                }

                if (fsService.isDirectory(node)) {
                    output += `wc: ${filename}: Is a directory\n`;
                    output += ` 0 0 0 ${filename}\n`;
                    exitCode = 1;
                    continue;
                }

                try {
                    const content = fsService.readFile(path);
                    output += processContent(content, filename) + '\n';
                } catch (e: any) {
                    output += `wc: ${filename}: ${e.message}\n`;
                    exitCode = 1;
                }
            }

            if (operands.length > 1) {
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