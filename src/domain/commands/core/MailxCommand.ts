/**
 * MailxCommand - Core Command
 *
 * Process messages.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Mail system interface.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class MailxCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        // Checking mail
        // Check /var/mail/operator?
        // Simulated: "No mail for operator"
        const user = state.user || 'operator';
        return {
            output: `No mail for ${user}`,
            newState: state,
            exitCode: 0
        };
    }
}
