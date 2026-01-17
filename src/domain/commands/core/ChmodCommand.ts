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
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class ChmodCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
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
