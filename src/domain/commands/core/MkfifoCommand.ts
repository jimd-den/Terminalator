import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * MkfifoCommand - Core Command
 *
 * Creates named pipes (FIFOs).
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Calls fs.mkfifo to create a special file type.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

export class MkfifoCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.MODIFY];
    public readonly utility = 'mkfifo';

    constructor(private fs: FileSystemService) { 
        super();
    }

    protected override parseArgs(args: string[]) {
        super.parseArgs(args, ['m']);
    }

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        let mode = 0o644;
        const modeStr = this.options.get('m');

        if (modeStr) {
            try {
                mode = parseInt(modeStr, 8);
                if (isNaN(mode)) throw new Error('Invalid octal');
            } catch (e) {
                return { output: `mkfifo: invalid mode: '${modeStr}'`, newState: state, exitCode: 1 };
            }
        }

        if (operands.length === 0) {
            return { output: 'mkfifo: missing operand', newState: state, exitCode: 1 };
        }

        let output = '';
        let finalExitCode = 0;

        for (const target of operands) {
            try {
                this.fs.mkfifo(target, mode, 1000, 1000, state.currentDirectory);
            } catch (error: any) {
                output += `mkfifo: cannot create fifo '${target}': ${error.message}\n`;
                finalExitCode = 1;
            }
        }

        return { output: output.trim(), newState: state, exitCode: finalExitCode };
    }
}