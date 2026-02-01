
import { IGameManager } from '../domain/interfaces/IGameManager';
import { NetworkMap } from '../domain/services/NetworkMap';
import { analyzeGameState, checkMissionProgression, TutorAction } from '../domain/services/TutorService';
import { TerminalState } from '../domain/entities/TerminalState';
import { CommandResponse } from '../domain/entities/Command';
import { NPCGenerator, NPC } from '../domain/entities/NPC';
import { MissionGenerator, Mission, MissionStep } from '../domain/entities/Mission';
import { MailSystem, MailMessage } from '../domain/usecases/MailSystem';
import { FileSystem } from '../domain/entities/FileSystem';
import { TelemetryPort } from '../domain/ports/TelemetryPort';
import { FileSystemService } from '../domain/services/FileSystemService';
import { SystemGenerator } from '../domain/services/SystemGenerator';
import { TutorEngine, TutorEvent, Lesson } from '../domain/entities/TutorEngine';
import { LessonService } from '../domain/services/LessonService';
import { LessonType, LessonGenerator } from '../domain/services/LessonGenerator';

export class GameManager implements IGameManager {
    private mailSystem: MailSystem;
    private activeNPCs: NPC[] = [];
    private activeMissions: Mission[] = [];
    public readonly tutorEngine: TutorEngine;
    private networkMap: NetworkMap;
    private lessonService: LessonService;

    /**
     * Ensures a system has all necessary files for active missions.
     * @param hostname - Hostname of the system to prepare.
     */
    public ensureSystemPrepared(hostname: string) {
        const system = this.networkMap.getSystem(hostname);
        if (!system) return;

        const service = new FileSystemService(system);
        const relevantMissions = this.activeMissions.filter(m => m.targetSystem === hostname);

        relevantMissions.forEach(mission => {
            const targetPath = `/home/admin/${mission.objectiveTarget}`;
            // Only write if doesn't exist to preserve state (if it were persistent)
            try {
                service.mkdirp('/home/admin');
                service.writeFile(
                    targetPath,
                    `[ SECURE DATA ]\nSYSTEM: ${hostname}\nPAYLOAD: ${mission.objectiveTarget}\nAUTHENTICATION: REQUIRED\n\n${mission.description}`,
                    'w',
                    1002, // admin
                    1002  // admin
                );
            } catch (e) {
                // Ignore if exists/fails
            }
        });
    }

    /**
     * Initializes the Game Manager.
     *
     * @param fs - The file system entity.
     * @param telemetry - The telemetry port for logging events.
     */
    private fs: FileSystem;

    constructor(
        fs: FileSystem,
        networkMap: NetworkMap,
        private telemetry?: TelemetryPort
    ) {
        this.fs = fs;
        this.networkMap = networkMap;

        if (!this.fs) {
            throw new Error("GameManager initialized without FileSystem! Critical Error.");
        }

        const fsService = new FileSystemService(fs);
        this.mailSystem = new MailSystem(fsService, telemetry);
        this.tutorEngine = new TutorEngine();
        this.lessonService = new LessonService();

        // Wire up Tutor Events to IRC (MailSystem)
        this.tutorEngine.subscribe(this.handleTutorEvent);

        // Initialize System if empty
        if (fs.root && fs.root.children.size === 0) {
            const generator = new SystemGenerator();
            generator.populate(fsService, { difficulty: 1 });
        }
    }

    /**
     * Called after every command execution to update game state and trigger Tutor hints.
     */
    onCommandExecuted(state: TerminalState, response: CommandResponse, prevFsContext?: string) {
        // 1. Text Hints (IRC)
        for (const mission of this.activeMissions) {
            const hint = analyzeGameState(mission, state, response);
            if (hint) {
                const alreadySent = mission.chatHistory.some(m => m.message === hint.message);
                if (!alreadySent) {
                    const sender = hint.type === 'CONGRATS' ? 'SYSTEM' : 'TutorBot';
                    const missionIndex = this.activeMissions.indexOf(mission);
                    const updatedMission: Mission = {
                        ...mission,
                        chatHistory: [
                            ...mission.chatHistory,
                            {
                                sender,
                                message: hint.message,
                                timestamp: Date.now()
                            }
                        ],
                        status: hint.type === 'CONGRATS' ? 'completed' as const : mission.status,
                        currentStep: hint.type === 'CONGRATS' ? MissionStep.COMPLETED : mission.currentStep
                    };

                    this.activeMissions = [
                        ...this.activeMissions.slice(0, missionIndex),
                        updatedMission,
                        ...this.activeMissions.slice(missionIndex + 1)
                    ];

                    // If CONGRATS, payout
                    if (hint.type === 'CONGRATS') {
                        this.mailSystem.sendMail(
                            { name: 'Bank', id: 'bank', origin: '', career: '', goal: '', status: 'active', traits: [], loadout: [] },
                            'PAYMENT RECEIVED',
                            `Escrow released for Mission ${updatedMission.id}. ${updatedMission.reward} transferred.`
                        );
                    }
                }
            }
        }

        // 2. Progression Rules (Start new Lessons)
        const progression = checkMissionProgression(state, this.activeMissions, prevFsContext, response);

        if (progression && progression.result && progression.result.type === 'START_LESSON') {
            const missionIndex = this.activeMissions.findIndex(m => m.id === progression.missionId);
            if (missionIndex !== -1 && progression.result.nextStep) {
                console.log(`[GameManager] Mission ${progression.missionId} transitioning: ${this.activeMissions[missionIndex].currentStep} -> ${progression.result.nextStep}`);

                // [FIX] Immutable update to trigger React re-render
                this.activeMissions = [
                    ...this.activeMissions.slice(0, missionIndex),
                    {
                        ...this.activeMissions[missionIndex],
                        currentStep: progression.result.nextStep
                    },
                    ...this.activeMissions.slice(missionIndex + 1)
                ];
            }

            // ... Dynamic Lesson Construction ...
            setTimeout(() => {
                const lesson: Lesson = {
                    id: progression.result!.lessonId,
                    type: 'SHELL',
                    text: 'ls -la',
                    instructions: `CONNECTION ESTABLISHED. SCAN SYSTEM FOR ${progression.result!.objectiveTarget || 'TARGET'}`
                };

                this.tutorEngine.startLesson(lesson);
            }, 200);
        }
    }

    private handleTutorEvent = (event: TutorEvent) => {
        const tutorNpc = { name: 'TutorBot', career: 'Training AI', origin: 'Mainframe', goal: 'Educate' } as NPC;

        switch (event.type) {
            case 'MISTAKE':
                break;
            case 'SPEED_WARNING':
                if (event.payload === 'TOO FAST') {
                    // this.mailSystem.sendMail(tutorNpc, 'WARNING', 'SYNC RATE EXCEEDED. SLOW DOWN.');
                } else {
                    // this.mailSystem.sendMail(tutorNpc, 'WARNING', 'SIGNAL FADING. INPUT REQUIRED.');
                }
                break;
            case 'COMPLETE':
                this.mailSystem.sendMail(tutorNpc, 'LESSON COMPLETE', `MODULE ${event.payload.id} VERIFIED. PROCEEDING.`);
                break;
        }
    };

    /**
     * Triggers a new transmission from a random NPC.
     */
    spawnNPCEvent(): Mission | null {
        const spawnLogic = () => {
            if (this.activeMissions.length >= 4) {
                return null;
            }

            const npc = NPCGenerator.generate();
            this.activeNPCs.push(npc);

            const mission = MissionGenerator.generate(npc);

            // Ensure target system exists in the network
            this.networkMap.getSystem(mission.targetSystem);

            // Add initial "Handshake" message to the chat history
            mission.chatHistory = [
                { sender: 'SYSTEM', message: `CONNECTING TO SECURE CHANNEL ${mission.id}...`, timestamp: Date.now() },
                { sender: npc.name, message: `Operator, I require assistance with a ${mission.type} operation.`, timestamp: Date.now() },
                { sender: npc.name, message: mission.description, timestamp: Date.now() },
                { sender: 'SYSTEM', message: `REWARD ESCROW: ${mission.reward}`, timestamp: Date.now() },
            ];

            this.activeMissions.push(mission);

            // [FIX] Inject Mission Objective into Target System
            this.ensureSystemPrepared(mission.targetSystem);

            return mission;
        };

        if (this.telemetry) {
            return this.telemetry.trace('GameManager.spawnNPCEvent', spawnLogic);
        }

        return spawnLogic();
    }

    getActiveNPCs(): NPC[] {
        return this.activeNPCs;
    }

    getActiveMissions(): Mission[] {
        return this.activeMissions;
    }

    startMission(missionId: string) {
        console.log('[GameManager] startMission:', missionId);
        const mission = this.activeMissions.find(m => m.id === missionId);
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

            // [FIX] Auto-start Tutor Lesson for this mission
            const sshCommand = `ssh admin@${mission.targetSystem}`;
            const lesson: Lesson = {
                id: `MISSION_${mission.id}`,
                type: 'SHELL' as const,
                text: sshCommand,
                instructions: `INITIATE SATLINK // CONNECT TO ${mission.targetSystem}`
            };

            // Setup if needed (none for this simple lesson)
            // this.lessonService.setupLesson(lesson, this.fs);

            // Start the lesson
            this.tutorEngine.startLesson(lesson);
        }
    }

    abandonMission(missionId: string) {
        this.activeMissions = this.activeMissions.filter(m => m.id !== missionId);
    }

    // Debug/admin method to start tutor
    startTutor(lessonId: string) {
        const lesson = this.lessonService.getLesson(lessonId);
        if (lesson) {
            this.lessonService.setupLesson(lesson, this.fs);
            this.tutorEngine.startLesson(lesson);
        }
    }

    /**
     * Starts a dynamic, procedurally generated lesson.
     */
    startRandomLesson() {
        const types: LessonType[] = ['LOG_ANALYSIS', 'BULK_ORG', 'SCAFFOLDING', 'CLEANUP'];
        const randomType = types[Math.floor(Math.random() * types.length)];

        // Old Generator: const lesson = LessonGenerator.generate(randomType);
        // New Service Approach:
        const lesson = this.lessonService.generateDynamicLesson(randomType);

        this.lessonService.setupLesson(lesson, this.fs);
        this.tutorEngine.startLesson(lesson);
        return lesson;
    }
}
