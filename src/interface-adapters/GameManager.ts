import { getStdinAsString } from '../domain/entities/ProcessContext';
import { IGameManager } from '../domain/interfaces/IGameManager';
import { NetworkMap } from '../domain/services/NetworkMap';
import { TerminalState } from '../domain/entities/TerminalState';
import { CommandResponse } from '../domain/entities/Command';
import { NPC } from '../domain/entities/NPC';
import { Mission, MissionStep } from '../domain/entities/Mission';
import { MailSystem } from '../domain/usecases/MailSystem';
import { FileSystem } from '../domain/entities/FileSystem';
import { TelemetryPort } from '../domain/ports/TelemetryPort';
import { TutorEngine, Lesson } from '../domain/entities/TutorEngine';
import { LessonService } from '../domain/services/LessonService';
import { LessonType } from '../domain/services/LessonGenerator';

import { MissionService } from '../domain/services/MissionService';
import { NPCService } from '../domain/services/NPCService';
import { SystemPreparationService } from '../domain/services/SystemPreparationService';
import { LessonCoordinator } from './LessonCoordinator';
import { IWorldManager } from '../domain/interfaces/IWorldManager';
import { IWorldStateProvider } from '../domain/interfaces/IWorldStateProvider';

/**
 * GameManager - Interface Adapter layer
 * 
 * Acts as a Facade/Coordinator for the game's various subsystems.
 * Upgraded to support Scaling Engines.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (SOLID / KISS)
 */
export class GameManager implements IGameManager {
    private missionService: MissionService;
    private npcService: NPCService;
    private systemPreparationService: SystemPreparationService;
    private lessonCoordinator: LessonCoordinator;
    private mailSystem: MailSystem;
    private lessonService: LessonService;
    private worldManager: IWorldManager & IWorldStateProvider;

    public readonly tutorEngine: TutorEngine;

    constructor(
        private fs: FileSystem,
        private networkMap: NetworkMap,
        missionService: MissionService,
        npcService: NPCService,
        systemPreparationService: SystemPreparationService,
        lessonCoordinator: LessonCoordinator,
        mailSystem: MailSystem,
        lessonService: LessonService,
        worldManager: IWorldManager & IWorldStateProvider,
        tutorEngine: TutorEngine,
        private telemetry?: TelemetryPort
    ) {
        if (!this.fs) {
            throw new Error("GameManager initialized without FileSystem! Critical Error.");
        }

        this.missionService = missionService;
        this.npcService = npcService;
        this.systemPreparationService = systemPreparationService;
        this.lessonCoordinator = lessonCoordinator;
        this.mailSystem = mailSystem;
        this.lessonService = lessonService;
        this.worldManager = worldManager;
        this.tutorEngine = tutorEngine;
    }

    public getWorldManager(): IWorldManager & IWorldStateProvider {
        return this.worldManager;
    }

    private listeners: ((event: string, payload?: any) => void)[] = [];

    public subscribeToEvents(listener: (event: string, payload?: any) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private emitEvent(event: string, payload?: any) {
        this.listeners.forEach(l => l(event, payload));
    }

    /**
     * Called after every command execution to update game state.
     */
    public onCommandExecuted(state: TerminalState, response: CommandResponse, _prevFsContext?: string) {
        // Emit for TutorBrain observation (includes exitCode and utility)
        this.emitEvent('COMMAND_EXECUTED', { 
            output: response.output, 
            exitCode: response.exitCode,
            utility: response.metadata?.utility || 'unknown'
        });

        const { hints, progression } = this.missionService.updateMissions(state, response);

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

        if (progression && progression.result && progression.result.type === 'START_LESSON') {
            const result = progression.result;
            const lessonId = result.lessonId;
            const objective = result.objectiveTarget || 'TARGET';

            setTimeout(() => {
                const lesson: Lesson = {
                    id: lessonId,
                    type: 'SHELL',
                    text: result.text || 'ls -la',
                    instructions: result.instructions || `CONNECTION ESTABLISHED. SCAN SYSTEM FOR ${objective}`,
                    isMission: result.isMission || true
                };
                this.tutorEngine.startLesson(lesson);
            }, 200);
        }
    }

    /**
     * Triggers a new transmission from a random NPC and generates a mission.
     */
    public async spawnNPCEvent(): Promise<Mission | null> {
        const spawnLogic = async () => {
            if (this.missionService.getActiveMissions().length >= 4) {
                return null;
            }

            const npc = this.npcService.spawnNPC();
            const mission = await this.missionService.createMission(npc);

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

    public getMissionById(id: string): Mission | undefined {
        return this.missionService.getMissionById(id);
    }

    public startMission(missionId: string, currentState?: TerminalState) {
        const mission = this.missionService.getMissionById(missionId);
        if (mission && mission.status === 'pending') {
            mission.status = 'active';
            mission.chatHistory.push({
                sender: 'SYSTEM',
                message: `MISSION STARTED. TARGET: ${mission.targetSystem}`,
                timestamp: Date.now()
            });

            if (currentState && currentState.fsContext === mission.targetSystem) {
                mission.chatHistory.push({
                    sender: 'TutorBot',
                    message: `Link verified. You are already on ${mission.targetSystem}. Proceed with objectives.`,
                    timestamp: Date.now() + 100
                });

                this.onCommandExecuted(currentState, { output: 'SYSTEM RECOVERY INITIALIZED', exitCode: 0, newState: currentState } as any);
                return;
            }

            mission.chatHistory.push({
                sender: 'TutorBot',
                message: `Acknowledged. Initiate connection protocol: 'ssh admin@${mission.targetSystem}'.`,
                timestamp: Date.now() + 100
            });

            const sshCommand = `ssh admin@${mission.targetSystem}`;
            const lesson: Lesson = {
                id: `MISSION_${mission.id}`,
                type: 'SHELL' as const,
                text: sshCommand,
                instructions: `INITIATE SATLINK // CONNECT TO ${mission.targetSystem}`,
                isMission: true
            };

            this.tutorEngine.startLesson(lesson);
        }
    }

    public abandonMission(missionId: string) {
        this.missionService.abandonMission(missionId);
    }

    public ensureSystemPrepared(hostname: string) {
        this.systemPreparationService.prepareSystemForMissions(hostname, this.missionService.getActiveMissions());
    }

    public startTutor(lessonId: string) {
        const lesson = this.lessonService.getLesson(lessonId);
        if (lesson) {
            this.lessonService.setupLesson(lesson, this.fs);
            this.tutorEngine.startLesson(lesson);
        }
    }

    public startRandomLesson(): Lesson {
        const types: LessonType[] = ['LOG_ANALYSIS', 'BULK_ORG', 'SCAFFOLDING', 'CLEANUP'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        const lesson = this.lessonService.generateDynamicLesson(randomType);

        this.lessonService.setupLesson(lesson, this.fs);
        this.tutorEngine.startLesson(lesson);
        return lesson;
    }
}