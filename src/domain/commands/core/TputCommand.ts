import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * TputCommand - Core Command
 *
 * Initialize terminal or query terminfo.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Terminal control.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystem } from '../../entities/FileSystem';

export class TputCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        const cap = args[0];
        if (cap === 'clear') {
            // UI action needed?
            // "If the operand is 'clear', clear the screen."
            // We can return a special UI action if supported, or just empty output.
            // ExecuteCommand supports uiAction?
            // "uiAction?: 'CLEAR'"
            return {
                output: '',
                newState: state,
                exitCode: 0,
                uiAction: 'CLEAR'
            };
        }
        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}
