/**
 * CheckCommsCommand - Game Command
 *
 * Simulates checking for new transmissions (spawns an NPC event).
 *
 * Pillar: The Storyteller’s Code (Literate Documentation)
 * Pillar: The Four-Fold Shield (Strict Architecture)
 */

import { ICommand } from '../../domain/commands/ICommand';
import { TerminalState } from '../../domain/entities/TerminalState';
import { CommandResponse } from '../../domain/usecases/ExecuteCommand';
import { GameManager } from '../GameManager';

export class CheckCommsCommand implements ICommand {
    constructor(private gameManager: GameManager) {}

    execute(args: string[], state: TerminalState): CommandResponse {
        const mail = this.gameManager.spawnNPCEvent();
        return {
            output: `[ SECURE CHANNEL ESTABLISHED ]\nIncoming transmission from ${mail.from}...\nMessage saved to /home/operator/mail/${mail.id}`,
            newState: state,
            exitCode: 0,
        };
    }
}
