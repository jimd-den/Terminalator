import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * UnexpandCommand - Core Command
 *
 * Convert spaces to tabs.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Convert runs of spaces to tabs.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';

export class UnexpandCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.TRANSFORM];
    public readonly utility = 'unexpand';

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
        const all = flags.has('a');
        const files = operands;

        let content = '';
        if (files.length > 0) {
            for (const file of files) {
                try {
                    content += this.fs.readFile(this.resolvePath(file, state));
                } catch (e) {
                    return { output: `unexpand: ${file}: No such file`, newState: state, exitCode: 1 };
                }
            }
        } else if (input) {
            content = input;
        } else {
            return { output: '', newState: state, exitCode: 0 };
        }

        const lines = content.split('\n');
        const output: string[] = [];
        const tabStop = 8;

        for (const line of lines) {
            if (!all) {
                let spaces = 0;
                while (spaces < line.length && line[spaces] === ' ') {
                    spaces++;
                }
                if (spaces > 0) {
                    const tabs = Math.floor(spaces / tabStop);
                    const rem = spaces % tabStop;
                    output.push('\t'.repeat(tabs) + ' '.repeat(rem) + line.slice(spaces));
                } else {
                    output.push(line);
                }
            } else {
                let res = '';
                let col = 0;
                let pendingSpaces = 0;

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === ' ') {
                        pendingSpaces++;
                        col++;
                        if (col % tabStop === 0 && pendingSpaces > 1) {
                            res += '\t';
                            pendingSpaces = 0;
                        }
                    } else {
                        res += ' '.repeat(pendingSpaces);
                        pendingSpaces = 0;
                        res += char;
                        col++;
                        if (char === '\t') {
                            col = Math.ceil((col + 1) / tabStop) * tabStop;
                        } else if (char === '\b') {
                            col--;
                        }
                    }
                }
                res += ' '.repeat(pendingSpaces);
                output.push(res);
            }
        }

        return {
            output: output.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}