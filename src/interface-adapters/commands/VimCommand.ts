/**
 * VimCommand - Game Command
 *
 * Opens the VIM text editor (simulated).
 *
 * Pillar: The Storyteller’s Code (Literate Documentation)
 * Pillar: The Four-Fold Shield (Strict Architecture)
 */

import { ICommand } from '../../domain/commands/ICommand';
import { TerminalState } from '../../domain/entities/TerminalState';
import { CommandResponse } from '../../domain/usecases/ExecuteCommand';

export class VimCommand implements ICommand {
    execute(args: string[], state: TerminalState): CommandResponse {
        const filename = args[0] || 'scratchpad.24xx';
        return {
            output: `Opening ${filename} in editor...`,
            newState: state,
            exitCode: 0,
            navigationAction: {
                type: 'NAVIGATE',
                target: 'Editor',
                params: { filename }
            }
        };
    }
}
