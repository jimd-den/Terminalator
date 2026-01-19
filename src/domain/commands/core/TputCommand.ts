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
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class TputCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
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
