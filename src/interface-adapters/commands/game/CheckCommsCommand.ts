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

        if (!mission) {
            return {
                output: `
ERROR: SECURE CHANNEL LIMIT REACHED.
Active conduits saturated (4/4). 
Close existing channels to establish new connections.
`.trim(),
                newState: state,
                exitCode: 1
            };
        }

        return {
            output: `
[SECURE CONNECTION ESTABLISHED]
Channel ID: ${mission.id}
Source: ${mission.assignerName}
Encryption: AES-256-GCM
Status: HANDSHAKE_COMPLETE
`.trim(),
            newState: state,
            exitCode: 0
        };
    }
}
