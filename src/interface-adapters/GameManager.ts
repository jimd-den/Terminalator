/**
 * GameManager - Interface Adapter Layer
 * 
 * Orchestrates the procedural elements of the game.
 * Spawns NPCs, triggers mail events, and tracks player progress.
 */

import { NPCGenerator, NPC } from '../domain/entities/NPC';
import { MissionGenerator, Mission } from '../domain/entities/Mission';
import { MailSystem, MailMessage } from '../domain/usecases/MailSystem';
import { Logger } from '../infrastructure/telemetry/Logger';
import { FileSystem } from '../domain/entities/FileSystem';

export class GameManager {
    private mailSystem: MailSystem;
    private activeNPCs: NPC[] = [];

    constructor(fs: FileSystem) {
        this.mailSystem = new MailSystem(fs);
    }

    /**
     * Triggers a new transmission from a random NPC.
     */
    /**
     * Triggers a new transmission from a random NPC.
     */
    spawnNPCEvent(fs?: FileSystem): MailMessage {
        return Logger.trace('GameManager.spawnNPCEvent', () => {
            const npc = NPCGenerator.generate();
            this.activeNPCs.push(npc);

            const mission = MissionGenerator.generate(npc);

            const subject = `MISSION: ${mission.type.toUpperCase()} - ${mission.target}`;
            const body = `Operator,\n\nI am ${npc.name}, a ${npc.career} from ${npc.origin}.\nMy goal is to ${npc.goal}.\n\nMISSION BRIEFING:\n${mission.description}\n\nREWARD: ${mission.reward}\n\nExecute protocol immediately.\n\nOver.`;

            return this.mailSystem.sendMail(npc, subject, body, fs);
        });
    }

    getActiveNPCs(): NPC[] {
        return this.activeNPCs;
    }
}
