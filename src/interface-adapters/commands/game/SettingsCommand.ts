/**
 * SettingsCommand - Interface Adapter Layer
 * 
 * An in-game command to open the terminal options.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture) - Adapters
 */

import { ICommand } from '../../../domain/commands/ICommand';
import { CommandResponse } from '../../../domain/usecases/ExecuteCommand';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class SettingsCommand implements ICommand {
    readonly name = 'options';
    readonly description = 'Open terminal hardware settings';

    async execute(args: string[], state: TerminalState): Promise<CommandResponse> {
        return {
            output: 'ACCESSING HARDWARE FIRMWARE...',
            newState: state,
            exitCode: 0,
            navigationAction: {
                type: 'NAVIGATE',
                target: 'Settings',
                params: {}
            }
        };
    }
}
