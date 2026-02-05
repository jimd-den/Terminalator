import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * ExpandCommand - Core Command
 *
 * Convert tabs to spaces.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Tab expansion.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';

export class ExpandCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.TRANSFORM];
    public readonly utility = 'expand';

    constructor(private fs: FileSystemService) { 
        super();
    }

    protected override parseArgs(args: string[]) {
        // expand options that take arguments: -t
        super.parseArgs(args, ['t']);
    }

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        let tabStop = parseInt(this.options.get('t') || '8', 10) || 8;
        const files = operands;

        let content = '';
        if (files.length > 0) {
            for (const file of files) {
                try {
                    content += this.fs.readFile(this.resolvePath(file, state));
                } catch (e) {
                    return { output: `expand: ${file}: No such file`, newState: state, exitCode: 1 };
                }
            }
        } else if (input) {
            content = input;
        } else {
            return { output: '', newState: state, exitCode: 0 };
        }

        const lines = content.split('\n');
        const output: string[] = [];

        for (const line of lines) {
            let expanded = '';
            for (let i = 0; i < line.length; i++) {
                if (line[i] === '\t') {
                    const currentPos = expanded.length;
                    const spaces = tabStop - (currentPos % tabStop);
                    expanded += ' '.repeat(spaces);
                } else {
                    expanded += line[i];
                }
            }
            output.push(expanded);
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