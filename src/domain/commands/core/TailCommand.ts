import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * TailCommand - Core Command
 *
 * Output the last part of files.
 *
 * Pillar: THE FOUR-FOLD SHIELD (Strict Architecture)
 * Pillar: THE Swift Stream (Performance)
 * Pillar: THE Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to view the end of files.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';

export class TailCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.READ, CommandCapability.FILTER];
    public readonly utility = 'tail';

    constructor(private fs: FileSystemService) {
        super();
    }

    protected override parseArgs(args: string[]) {
        super.parseArgs(args, ['n', 'c']);
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
        let bytesToPrint = -1;

        const nOption = this.options.get('n');
        if (nOption) linesToPrint = parseInt(nOption);

        const cOption = this.options.get('c');
        if (cOption) bytesToPrint = parseInt(cOption);

        const getTail = (content: string): string => {
            if (bytesToPrint !== -1) {
                return content.slice(-bytesToPrint);
            }

            const lines = content.split('\n');
            let effectiveLines = lines;
            let hasTrailing = false;
            if (lines.length > 0 && lines[lines.length - 1] === '') {
                effectiveLines = lines.slice(0, -1);
                hasTrailing = true;
            }

            const snippet = effectiveLines.slice(-linesToPrint);
            let output = snippet.join('\n');
            if (hasTrailing && snippet.length > 0) {
                output += '\n';
            }
            return output;
        };

        if (operands.length === 0 || (operands.length === 1 && operands[0] === '-')) {
            if (input !== undefined) {
                return { output: getTail(input), newState: state, exitCode: 0 };
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
                output += getTail(content);
            } catch (error: any) {
                output += `tail: cannot open '${filename}' for reading: No such file or directory`;
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