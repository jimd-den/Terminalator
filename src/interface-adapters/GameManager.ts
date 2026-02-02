
import { IGameManager } from '../domain/interfaces/IGameManager';
import { NetworkMap } from '../domain/services/NetworkMap';
import { TerminalState } from '../domain/entities/TerminalState';
import { CommandResponse } from '../domain/entities/Command';
import { NPC } from '../domain/entities/NPC';
import { Mission, MissionStep } from '../domain/entities/Mission';
import { MailSystem } from '../domain/usecases/MailSystem';
import { FileSystem } from '../domain/entities/FileSystem';
import { TelemetryPort } from '../domain/ports/TelemetryPort';
import { FileSystemService } from '../domain/services/FileSystemService';
import { TutorEngine, Lesson } from '../domain/entities/TutorEngine';
import { LessonService } from '../domain/services/LessonService';
import { LessonType } from '../domain/services/LessonGenerator';

// New Domain Services
import { MissionService } from '../domain/services/MissionService';
import { NPCService } from '../domain/services/NPCService';
import { SystemPreparationService } from '../domain/services/SystemPreparationService';
import { LessonCoordinator } from './LessonCoordinator';

/**
 * GameManager - Interface Adapter layer
 * 
 * Acts as a Facade/Coordinator for the game's various subsystems.
 * It delegatest heavy lifting to specialized Domain Services while
 * providing a unified interface for the UI and other adapters.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (SOLID / KISS) - SRP: This class is now a coordinator.
 */
export class GameManager implements IGameManager {
    private missionService: MissionService;
    private npcService: NPCService;
    private systemPreparationService: SystemPreparationService;
    private lessonCoordinator: LessonCoordinator;
    private mailSystem: MailSystem;
    private lessonService: LessonService;

    public readonly tutorEngine: TutorEngine;

    constructor(
        private fs: FileSystem,
        private networkMap: NetworkMap,
        private telemetry?: TelemetryPort
    ) {
        if (!this.fs) {
            throw new Error("GameManager initialized without FileSystem! Critical Error.");
        }

        const fsService = new FileSystemService(fs);

        // Initialize Domain Services
        this.missionService = new MissionService();
        this.npcService = new NPCService();
        this.systemPreparationService = new SystemPreparationService(networkMap);

        // Initialize Core Use Cases / Engines
        this.mailSystem = new MailSystem(fsService, telemetry);
        this.tutorEngine = new TutorEngine();
        this.lessonService = new LessonService();

        // Initialize Coordinator (Interface Adapter)
        this.lessonCoordinator = new LessonCoordinator(this.tutorEngine, this.mailSystem, this.missionService);

        // Initial setup
        this.systemPreparationService.initializeRootFileSystem(fs);
    }

    /**
     * Called after every command execution to update game state and trigger updates.
     */
    public onCommandExecuted(state: TerminalState, response: CommandResponse, _prevFsContext?: string) {
        // Delegate mission logic to MissionService
        const { hints, progression } = this.missionService.updateMissions(state, response);

        // Handle Payment Lore if a mission was completed
        hints.filter(h => h.type === 'CONGRATS').forEach(h => {
            const mission = this.missionService.getMissionById(h.missionId);
            if (mission) {
                this.mailSystem.sendMail(
                    { id: 'bank', name: 'Bank', origin: '', career: '', goal: '', status: 'active', traits: [], loadout: [] },
                    'PAYMENT RECEIVED',
                    `Escrow released for Mission ${mission.id}. ${mission.reward} transferred.`
                );
            }
        });

        // Trigger Lessons based on progression
        if (progression && progression.result && progression.result.type === 'START_LESSON') {
            const lessonId = progression.result.lessonId;
            const objective = progression.result.objectiveTarget || 'TARGET';

            setTimeout(() => {
                const lesson: Lesson = {
                    id: lessonId,
                    type: 'SHELL',
                    text: 'ls -la',
                    instructions: `CONNECTION ESTABLISHED. SCAN SYSTEM FOR ${objective}`
                };
                this.tutorEngine.startLesson(lesson);
            }, 200);
        }
    }

    /**
     * Triggers a new transmission from a random NPC and generates a mission.
     */
    public spawnNPCEvent(): Mission | null {
        const spawnLogic = () => {
            if (this.missionService.getActiveMissions().length >= 4) {
                return null;
            }

            const npc = this.npcService.spawnNPC();
            const mission = this.missionService.createMission(npc);

            // Ensure target system exists and is prepared
            this.networkMap.getSystem(mission.targetSystem);
            this.systemPreparationService.prepareSystemForMissions(mission.targetSystem, [mission]);

            return mission;
        };

        if (this.telemetry) {
            return this.telemetry.trace('GameManager.spawnNPCEvent', spawnLogic);
        }

        return spawnLogic();
    }

    public getActiveNPCs(): NPC[] {
        return this.npcService.getActiveNPCs();
    }

    public getActiveMissions(): Mission[] {
        return this.missionService.getActiveMissions();
    }

    public startMission(missionId: string) {
        const mission = this.missionService.getMissionById(missionId);
        if (mission && mission.status === 'pending') {
            mission.status = 'active';
            mission.chatHistory.push({
                sender: 'SYSTEM',
                message: `MISSION STARTED. TARGET: ${mission.targetSystem}`,
                timestamp: Date.now()
            });
            mission.chatHistory.push({
                sender: 'TutorBot',
                message: `Acknowledged. Initiate connection protocol: 'ssh admin@${mission.targetSystem}'.`,
                timestamp: Date.now() + 100
            });

            // Auto-start Tutor Lesson for this mission
            const sshCommand = `ssh admin@${mission.targetSystem}`;
            const lesson: Lesson = {
                id: `MISSION_${mission.id}`,
                type: 'SHELL' as const,
                text: sshCommand,
                instructions: `INITIATE SATLINK // CONNECT TO ${mission.targetSystem}`
            };

            this.tutorEngine.startLesson(lesson);
        }
    }

    public abandonMission(missionId: string) {
        this.missionService.abandonMission(missionId);
    }

    /**
     * Ensures a system has all necessary files for active missions.
     * Delegated to SystemPreparationService.
     */
    public ensureSystemPrepared(hostname: string) {
        this.systemPreparationService.prepareSystemForMissions(hostname, this.missionService.getActiveMissions());
    }

    /**
     * Debug/admin method to start a specific lesson.
     */
    public startTutor(lessonId: string) {
        const lesson = this.lessonService.getLesson(lessonId);
        if (lesson) {
            this.lessonService.setupLesson(lesson, this.fs);
            this.tutorEngine.startLesson(lesson);
        }
    }

    /**
     * Starts a dynamic, procedurally generated lesson.
     */
    public startRandomLesson(): Lesson {
        const types: LessonType[] = ['LOG_ANALYSIS', 'BULK_ORG', 'SCAFFOLDING', 'CLEANUP'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        const lesson = this.lessonService.generateDynamicLesson(randomType);

        this.lessonService.setupLesson(lesson, this.fs);
        this.tutorEngine.startLesson(lesson);
        return lesson;
    }
}
