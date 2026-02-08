import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * FoldCommand - Core Command
 *
 * Wrap each input line to fit in specified width.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Break long lines for display.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';

export class FoldCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.TRANSFORM];
    public readonly utility = 'fold';

    constructor(private fs: FileSystemService) { 
        super();
    }

    protected override parseArgs(args: string[]) {
        // fold options that take arguments: -w
        super.parseArgs(args, ['w']);
    }

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        let width = parseInt(this.options.get('w') || '80', 10) || 80;
        let files = operands;

        let content = '';

        if (files.length > 0) {
            for (const file of files) {
                try {
                    const path = this.resolvePath(file, state);
                    content += this.fs.readFile(path);
                } catch (e) {
                    return { output: `fold: ${file}: No such file`, newState: state, exitCode: 1 };
                }
            }
        } else if (input) {
            content = input;
        } else {
            return { output: '', newState: state, exitCode: 0 };
        }

        const lines = content.split('\n');
        const outputLines: string[] = [];

        for (const line of lines) {
            if (line.length <= width) {
                outputLines.push(line);
            } else {
                let pos = 0;
                while (pos < line.length) {
                    outputLines.push(line.slice(pos, pos + width));
                    pos += width;
                }
            }
        }

        return {
            output: outputLines.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}