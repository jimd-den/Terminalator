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


import { FileSystemService } from '../domain/services/FileSystemService';
import { SystemGenerator } from '../domain/services/SystemGenerator';
import { TutorEngine, TutorEvent } from '../domain/entities/TutorEngine';
import { LessonGenerator, LessonType } from '../domain/services/LessonGenerator';

import { IGameManager } from '../domain/interfaces/IGameManager';

export class GameManager implements IGameManager {
    private mailSystem: MailSystem;
    private activeNPCs: NPC[] = [];
    private activeMissions: Mission[] = [];
    public readonly tutorEngine: TutorEngine;

    /**
     * Initializes the Game Manager.
     *
     * @param fs - The file system entity.
     * @param telemetry - The telemetry port for logging events.
     */
    private fs: FileSystem;

    /**
     * Initializes the Game Manager.
     *
     * @param fs - The file system entity.
     * @param telemetry - The telemetry port for logging events.
     */
    constructor(fs: FileSystem, private telemetry?: TelemetryPort) {
        this.fs = fs;
        if (!this.fs) {
            throw new Error("GameManager initialized without FileSystem! Critical Error.");
        }

        const fsService = new FileSystemService(fs);
        this.mailSystem = new MailSystem(fsService, telemetry);
        this.tutorEngine = new TutorEngine();

        // Wire up Tutor Events to IRC (MailSystem)
        this.tutorEngine.subscribe(this.handleTutorEvent);

        // Initialize System if empty
        // Checking if root has no children (except potentially . and .. which are virtual/not in map? 
        // Dentry children map usually empty on fresh init)
        if (fs.root && fs.root.children.size === 0) {
            const generator = new SystemGenerator();
            generator.populate(fsService, { difficulty: 1 });
        }
    }

    private handleTutorEvent = (event: TutorEvent) => {
        // Create a "System" or "Tutor" NPC for these messages if not exists
        const tutorNpc = { name: 'TutorBot', career: 'Training AI', origin: 'Mainframe', goal: 'Educate' } as NPC;

        switch (event.type) {
            case 'MISTAKE':
                // Optional: spam user on big mistakes?
                // this.mailSystem.sendMail(tutorNpc, 'ERROR', 'SYNC LOSS DETECTED. RECALIBRATING...');
                break;
            case 'SPEED_WARNING':
                if (event.payload === 'TOO FAST') {
                    this.mailSystem.sendMail(tutorNpc, 'WARNING', 'SYNC RATE EXCEEDED. SLOW DOWN.');
                } else {
                    this.mailSystem.sendMail(tutorNpc, 'WARNING', 'SIGNAL FADING. INPUT REQUIRED.');
                }
                break;
            case 'COMPLETE':
                this.mailSystem.sendMail(tutorNpc, 'LESSON COMPLETE', `MODULE ${event.payload.id} VERIFIED. PROCEEDING.`);
                // Auto-start next random lesson after a delay?
                // Or let user request it.
                // For now, let's auto-generate a mail invite for the next one?
                // Or just end.
                break;
        }
    };

    /**
     * Triggers a new transmission from a random NPC.
     * Creates an NPC, generates a mission, and registers it as an active channel.
     *
     * @returns The created Mission or null if limit reached.
     */
    spawnNPCEvent(): Mission | null {
        const spawnLogic = () => {
            if (this.activeMissions.length >= 4) {
                return null;
            }

            const npc = NPCGenerator.generate();
            this.activeNPCs.push(npc);

            const mission = MissionGenerator.generate(npc);
            // Add initial "Handshake" message to the chat history
            mission.chatHistory = [
                { sender: 'SYSTEM', message: `CONNECTING TO SECURE CHANNEL ${mission.id}...`, timestamp: Date.now() },
                { sender: npc.name, message: `Operator, I require assistance with a ${mission.type} operation.`, timestamp: Date.now() },
                { sender: npc.name, message: mission.description, timestamp: Date.now() },
                { sender: 'SYSTEM', message: `REWARD ESCROW: ${mission.reward}`, timestamp: Date.now() },
            ];

            this.activeMissions.push(mission);
            return mission;
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

    /**
     * Retrieves the list of currently active Missions.
     */
    getActiveMissions(): Mission[] {
        return this.activeMissions;
    }

    // Debug/admin method to start tutor
    startTutor(lessonId: string) {
        this.tutorEngine.startLesson(lessonId, this.fs);
    }

    /**
     * Starts a dynamic, procedurally generated lesson.
     */
    startRandomLesson() {
        const types: LessonType[] = ['LOG_ANALYSIS', 'BULK_ORG', 'SCAFFOLDING', 'CLEANUP'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        const lesson = LessonGenerator.generate(randomType);

        this.tutorEngine.startLesson(lesson, this.fs);
        return lesson;
    }
}
