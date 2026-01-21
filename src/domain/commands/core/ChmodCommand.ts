/**
 * ChmodCommand - Core Command
 *
 * Changes file modes.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to change file permissions.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

export class ChmodCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
        const flags = args.filter(arg => arg.startsWith('-'));
        const operands = args.filter(arg => !arg.startsWith('-'));

        if (operands.length < 2) {
            return {
                output: 'chmod: missing operand',
                newState: state,
                exitCode: 1
            };
        }

        const modeStr = operands[0];
        const files = operands.slice(1);

        // Parse mode
        let mode: number;

        // Strict Octal check: must contain only 0-7
        if (/^[0-7]+$/.test(modeStr)) {
            mode = parseInt(modeStr, 8);
        } else {
            return {
                output: `chmod: ${modeStr}: invalid mode`,
                newState: state,
                exitCode: 1
            };
        }

        for (const filename of files) {
            let path = filename;
            if (!filename.startsWith('/')) {
                path = state.currentDirectory === '/'
                    ? `/${filename}`
                    : `${state.currentDirectory}/${filename}`;
            }

            try {
                this.fs.chmod(path, mode);
            } catch (e: any) {
                return {
                    output: `chmod: ${e.message}`, // e.message typically "chmod: cannot access..."
                    newState: state,
                    exitCode: 1
                };
            }
        }

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}
