import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../../domain/entities/TerminalState';
import { GameManager } from '../../GameManager';

export class CheckCommsCommand implements ICommand {
    name = 'check-comms';
    description = 'Force synchronization with network nodes (Spawn Event)';

    constructor(private gameManager: GameManager) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        const mission = this.gameManager.spawnNPCEvent();
        return {
            output: `[ SIGNAL DETECTED ]\nNew channel opened: #${mission.id}\nType: ${mission.type.toUpperCase()}\nTarget: ${mission.target}\n\nCheck the IRC tab for details.`,
            exitCode: 0,
            newState: state
        };
    }
}
