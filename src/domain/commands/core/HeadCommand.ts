import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * HeadCommand - Core Command
 *
 * Output the first part of files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to view the beginning of files.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';

export class HeadCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.READ, CommandCapability.FILTER];
    public readonly utility = 'head';

    constructor(private fs: FileSystemService) {
        super();
    }

    protected override parseArgs(args: string[]) {
        super.parseArgs(args, ['n']);
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
        
        let linesToPrint = 10;
        const nOption = this.options.get('n');
        if (nOption) {
            linesToPrint = parseInt(nOption);
        }

        const getHead = (content: string): string => {
            const lines = content.split('\n');
            const snippet = lines.slice(0, linesToPrint);
            return snippet.join('\n');
        };

        if (operands.length === 0 || (operands.length === 1 && operands[0] === '-')) {
            if (input !== undefined) {
                return { output: getHead(input), newState: state, exitCode: 0 };
            } else {
                return { output: '', newState: state, exitCode: 0 };
            }
        }

        let output = '';
        let exitCode = 0;

        for (let i = 0; i < operands.length; i++) {
            const filename = operands[i];

            if (operands.length > 1) {
                if (i > 0) output += '\n';
                output += `==> ${filename} <==\n`;
            }

            let path = filename;
            if (!path.startsWith('/')) {
                path = state.currentDirectory === '/' ? `/${filename}` : `${state.currentDirectory}/${filename}`;
            }

            try {
                const content = fsService.readFile(path);
                output += getHead(content);
            } catch (error: any) {
                output += `head: cannot open '${filename}' for reading: No such file or directory`;
                exitCode = 1;
            }
        }

        return {
            output: output,
            newState: state,
            exitCode: exitCode
        };
    }
}