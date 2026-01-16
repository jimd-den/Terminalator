/**
 * GameManager - Interface Adapter Layer
 * 
 * Orchestrates the procedural elements of the game.
 * Spawns NPCs, triggers mail events, and tracks player progress.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Watchman’s Log (Telemetry)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 */

import { NPCGenerator, NPC } from '../domain/entities/NPC';
import { MissionGenerator, Mission } from '../domain/entities/Mission';
import { MailSystem, MailMessage } from '../domain/usecases/MailSystem';
import { FileSystem } from '../domain/entities/FileSystem';
import { TelemetryPort } from '../domain/ports/TelemetryPort';

export class GameManager {
    private mailSystem: MailSystem;
    private activeNPCs: NPC[] = [];

    /**
     * Initializes the Game Manager.
     *
     * @param fs - The file system entity.
     * @param telemetry - The telemetry port for logging events.
     */
    constructor(fs: FileSystem, private telemetry?: TelemetryPort) {
        this.mailSystem = new MailSystem(fs, telemetry);
    }

    /**
     * Triggers a new transmission from a random NPC.
     * Creates an NPC, generates a mission, and sends a mail to the operator.
     *
     * @returns The created MailMessage.
     */
    spawnNPCEvent(): MailMessage {
        const spawnLogic = () => {
            const npc = NPCGenerator.generate();
            this.activeNPCs.push(npc);

            const mission = MissionGenerator.generate(npc);

            const subject = `MISSION: ${mission.type.toUpperCase()} - ${mission.target}`;
            const body = `Operator,\n\nI am ${npc.name}, a ${npc.career} from ${npc.origin}.\nMy goal is to ${npc.goal}.\n\nMISSION BRIEFING:\n${mission.description}\n\nREWARD: ${mission.reward}\n\nExecute protocol immediately.\n\nOver.`;

            return this.mailSystem.sendMail(npc, subject, body);
        };

        if (this.telemetry) {
            return this.telemetry.trace('GameManager.spawnNPCEvent', spawnLogic);
        }

        return spawnLogic();
    }

    /**
     * Retrieves the list of currently active NPCs.
     */
    getActiveNPCs(): NPC[] {
        return this.activeNPCs;
    }
}
