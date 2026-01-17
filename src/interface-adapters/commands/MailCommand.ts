/**
 * MailCommand - Game Command
 *
 * Lists available mail in the secure inbox.
 *
 * Pillar: The Storyteller’s Code (Literate Documentation)
 * Pillar: The Four-Fold Shield (Strict Architecture)
 */

import { ICommand } from '../../domain/commands/ICommand';
import { TerminalState } from '../../domain/entities/TerminalState';
import { CommandResponse } from '../../domain/usecases/ExecuteCommand';
import { MailSystem } from '../../domain/usecases/MailSystem';

export class MailCommand implements ICommand {
    constructor(private mailSystem: MailSystem) {}

    execute(args: string[], state: TerminalState): CommandResponse {
        return {
            output: this.mailSystem.listMail(),
            newState: state,
            exitCode: 0
        };
    }
}
