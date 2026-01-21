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
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class MailxCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
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
