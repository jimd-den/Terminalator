import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse, CommandMetadata } from '../../entities/Command';
import { TheatricalVerb } from '../../services/PresentationDirector';
import { IGameManager } from '../../interfaces/IGameManager';

/**
 * IrcCommand - Core Command
 * 
 * Provides a Unix-style interface for mission communications.
 * 
 * Usage:
 *   irc                 # List active channels (missions)
 *   irc -list           # List active channels
 *   irc -read <id>      # Read chat history
 *   irc -accept <id>    # Accept a pending mission
 *   irc -decline <id>   # Decline/Abandon a mission
 * 
 * Pillar: THE UNIVERSAL INTERFACE (CLI First)
 */
export class IrcCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.COMMUNICATIONS];
    public readonly utility = 'irc';

    constructor(private gameManager: IGameManager) {
        super();
    }

    public getMetadata(): CommandMetadata {
        return {
            verb: TheatricalVerb.CONNECT,
            style: 'NORMAL'
        };
    }

    executeInternal(args: string[], flags: Set<string>, targets: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const missions = this.gameManager.getActiveMissions();

        // 1. ACCEPT Mission
        if (flags.has('accept') || flags.has('a')) {
            const targetId = targets[0];
            if (!targetId) return { output: 'irc: usage: irc -accept <mission_id>', exitCode: 1, newState: state };
            
            const mission = missions.find(m => m.id === targetId);
            if (!mission) return { output: `irc: channel '${targetId}' not found`, exitCode: 1, newState: state };
            
            if (mission.status !== 'pending') return { output: `irc: mission '${targetId}' is already ${mission.status}`, exitCode: 1, newState: state };

            this.gameManager.startMission(targetId, state);
            return { output: `[ IRC ] CONNECTION ESTABLISHED. MISSION '${targetId}' ACCEPTED.`, exitCode: 0, newState: state };
        }

        // 2. DECLINE / ABANDON Mission
        if (flags.has('decline') || flags.has('d') || flags.has('abandon')) {
            const targetId = targets[0];
            if (!targetId) return { output: 'irc: usage: irc -decline <mission_id>', exitCode: 1, newState: state };

            this.gameManager.abandonMission(targetId);
            return { output: `[ IRC ] CHANNEL '${targetId}' CLOSED.`, exitCode: 0, newState: state };
        }

        // 3. READ History
        if (flags.has('read') || flags.has('r')) {
            const targetId = targets[0];
            if (!targetId) return { output: 'irc: usage: irc -read <mission_id>', exitCode: 1, newState: state };

            const mission = missions.find(m => m.id === targetId);
            if (!mission) return { output: `irc: channel '${targetId}' not found`, exitCode: 1, newState: state };

            const history = mission.chatHistory.map(msg => 
                `[${new Date(msg.timestamp).toLocaleTimeString()}] <${msg.sender}> ${msg.message}`
            ).join('\n');

            return { output: history || '[ NO MESSAGES ]', exitCode: 0, newState: state };
        }

        // 4. LIST (Default)
        let output = 'ACTIVE CHANNELS (IRC):\n';
        if (missions.length === 0) {
            output += '  [ NO ACTIVE SIGNALS ]';
        } else {
            output += missions.map(m => {
                const statusIcon = m.status === 'active' ? '+' : (m.status === 'completed' ? '*' : '?');
                return `  ${statusIcon} ${m.id.padEnd(12)} [${m.status.toUpperCase()}] :: ${m.assignerName}`;
            }).join('\n');
        }
        
        return {
            output,
            newState: state,
            exitCode: 0,
            // Explicitly ensure NO metadata is sent to trigger widget mode
            metadata: undefined 
        };
    }
}
