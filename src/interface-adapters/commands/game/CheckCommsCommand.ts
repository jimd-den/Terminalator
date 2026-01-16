import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';
import { GameManager } from '../../GameManager';

export class CheckCommsCommand implements ICommand {
    name = 'check-comms';
    description = 'Force synchronization with network nodes (Spawn Event)';

    constructor(private gameManager: GameManager) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const mail = this.gameManager.spawnNPCEvent(context.fs);
        return {
            output: `[ SECURE CHANNEL ESTABLISHED ]\nIncoming transmission from ${mail.from}...\nMessage saved to /home/operator/mail/${mail.id}`,
            exitCode: 0,
            newState: state
        };
    }
}
