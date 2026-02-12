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
import { PresentationDirector } from '../domain/services/PresentationDirector';
import { LessonService } from '../domain/services/LessonService';
import { LessonType } from '../domain/services/LessonGenerator';

import { MissionService } from '../domain/services/MissionService';

import { NPCService } from '../domain/services/NPCService';

import { WorldPatchService } from '../domain/services/world/WorldPatchService';

import { LessonCoordinator } from './LessonCoordinator';

import { IWorldManager } from '../domain/interfaces/IWorldManager';

import { IWorldStateProvider } from '../domain/interfaces/IWorldStateProvider';

import { SystemPreparationSpec } from '../domain/entities/world/SystemPreparationSpec';
import { SimulationBus, GameEventType } from '../domain/services/SimulationBus';
import { TutorObserver } from '../domain/services/tutor/TutorObserver';

/**
 * GameManager - Interface Adapter layer
 */
export class GameManager implements IGameManager {
    private missionService: MissionService;
    private npcService: NPCService;
    private worldPatchService: WorldPatchService;
    private lessonCoordinator: LessonCoordinator;
    private mailSystem: MailSystem;
    private lessonService: LessonService;
    private worldManager: IWorldManager & IWorldStateProvider;
    private presentationDirector: PresentationDirector;
    private tutorObserver: TutorObserver;

    public readonly tutorEngine: TutorEngine;

    constructor(
        private fs: FileSystem,
        private networkMap: NetworkMap,
        missionService: MissionService,
        npcService: NPCService,
        worldPatchService: WorldPatchService,
        lessonCoordinator: LessonCoordinator,
        mailSystem: MailSystem,
        lessonService: LessonService,
        worldManager: IWorldManager & IWorldStateProvider,
        tutorEngine: TutorEngine,
        presentationDirector: PresentationDirector,
        private bus: SimulationBus,
        tutorObserver: TutorObserver,
        private telemetry?: TelemetryPort
    ) {
        if (!this.fs) {
            throw new Error("GameManager initialized without FileSystem! Critical Error.");
        }

        this.missionService = missionService;
        this.npcService = npcService;
        this.worldPatchService = worldPatchService;
        this.lessonCoordinator = lessonCoordinator;
        this.mailSystem = mailSystem;
        this.lessonService = lessonService;
        this.worldManager = worldManager;
        this.tutorEngine = tutorEngine;
        this.presentationDirector = presentationDirector;
        this.tutorObserver = tutorObserver;

        this.initializeReactiveListeners();
    }

    private initializeReactiveListeners(): void {
        this.bus.subscribe(GameEventType.MISSION_PROGRESS, (event) => {
            if (event.payload.type === 'COMPLETED') {
                const mission = this.missionService.getMissionById(event.payload.missionId);
                if (mission) {
                    this.mailSystem.sendMail(
                        { id: 'bank', name: 'Bank', origin: '', career: '', goal: '', status: 'active', traits: [], loadout: [] },
                        'PAYMENT RECEIVED',
                        `Escrow released for Mission ${mission.id}. ${mission.reward} transferred.`
                    );
                }
            } else if (event.payload.type === 'PROGRESSION' && event.payload.result?.type === 'START_LESSON') {
                const result = event.payload.result;
                const lessonId = result.lessonId || 'DUMMY_LESSON';
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
                }, 2500);
            }
        });
    }

    public getTutorObserver(): TutorObserver {
        return this.tutorObserver;
    }

    public getSimulationBus(): SimulationBus {
            return this.bus;
        }

        public getWorldManager(): IWorldManager & IWorldStateProvider {



            return this.worldManager;



        }



    



        public getPresentationDirector(): PresentationDirector {



            return this.presentationDirector;



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
        // Pillar: THE BALANCED SCALE (Observer Pattern)
        // Emit for TutorObserver and other reactive listeners
        this.bus.emit(GameEventType.COMMAND_EXECUTED, { 
            command: response.utility || 'unknown',
            args: [], // Ideally parsed from the shell
            exitCode: response.exitCode,
            output: response.output,
            cwd: state.currentDirectory,
            state: state 
        });

        // Legacy: Internal listeners
        this.emitEvent('COMMAND_EXECUTED', { 
            output: response.output, 
            exitCode: response.exitCode,
            utility: response.utility || 'unknown'
        });

                const { hints, progression } = this.missionService.updateMissions(state, response);

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



            this.prepareSystem(mission.targetSystem, [mission]);



            return mission;

        };



        if (this.telemetry) {

            return this.telemetry.trace('GameManager.spawnNPCEvent', spawnLogic);

        }



        return spawnLogic();

    }



        private prepareSystem(hostname: string, missions: Mission[]) {



            // Legacy Adapter: Convert missions to Specs if they don't have one



            missions.filter(m => m.targetSystem === hostname).forEach(m => {



                if (m.metadata?.prepSpec) {



                    this.worldPatchService.patch(m.metadata.prepSpec);



                } else {



                    // Fallback to archetype-aware spec for legacy missions



                    const spec: SystemPreparationSpec = {



                        hostname,



                        requiredDirs: [],



                        files: [],



                        logs: []



                    };



    



                    if (m.type === 'log-analysis') {



                        spec.requiredDirs.push('/var/log/httpd', '/etc/httpd/conf.d');



                                            spec.logs.push({



                                                path: '/var/log/httpd/access.log',



                                                type: 'ACCESS',



                                                lineCount: 2000,



                                                errorRate: 0.05,



                                                keyPhrase: 'DB_FAIL'



                                            });



                                            spec.files.push({



                                                path: '/etc/httpd/conf.d/proxy.conf',



                                                rawContent: '# HTTP PROXY CONFIGURATION\n# Route all traffic to backends\n# BUG: Invalid route at 10.0.0.5'



                                            });



                                        } else if (m.type === 'dispatcher') {



                                            spec.requiredDirs.push('/var/db');



                                            spec.logs.push({



                                                path: '/var/db/incidents.csv',



                                                type: 'INCIDENT',



                                                lineCount: 10,



                                                errorRate: 0.1,



                                                keyPhrase: m.objectiveTarget



                                            });



                                            spec.logs.push({



                                                path: '/var/db/units.csv',



                                                type: 'UNIT',



                                                lineCount: 15,



                                                errorRate: 0,



                                                keyPhrase: ''



                                            });



                    } else {



                        // Standard Payload



                        spec.requiredDirs.push('/home/admin');



                        spec.files.push({



                            path: `/home/admin/${m.objectiveTarget}`,



                            rawContent: `[ SECURE DATA ]\nSYSTEM: ${hostname}\nPAYLOAD: ${m.objectiveTarget}\n\n${m.description}`,



                            owner: 'admin',



                            mode: 0o644



                        });



                    }



    



                    this.worldPatchService.patch(spec);



                }



            });



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



    



                                                            // Use Brain to generate reaction



    



                                                            this.tutorEngine.emit({ type: 'START', payload: { text: 'ssh', instructions: 'LINK ALREADY ACTIVE' } });



    



                                                            



    



                                                            this.onCommandExecuted(currentState, { output: 'SYSTEM RECOVERY INITIALIZED', exitCode: 0, newState: currentState } as any);



    



                                                            return;



    



                                                        }



    



                                



    



                                            // Determine lesson from grammar



    



                                            let lessonText = `ssh admin@${mission.targetSystem}`;



    



                                            let instructions = `INITIATE SATLINK // CONNECT TO ${mission.targetSystem}`;



    



                if (mission.grammar) {



                    const step = mission.grammar.steps.find(s => s.id === mission.currentStepId);



                    if (step && step.lessonText) {



                        lessonText = step.lessonText;



                        instructions = step.description;



                    }



                }



    



                const lesson: Lesson = {



                    id: `MISSION_${mission.id}`,



                    type: 'SHELL' as const,



                    text: lessonText,



                    instructions: instructions,



                    isMission: true



                };



    



                this.tutorEngine.startLesson(lesson);



            }



        }



    public abandonMission(missionId: string) {

        this.missionService.abandonMission(missionId);

    }



    public ensureSystemPrepared(hostname: string) {

        this.prepareSystem(hostname, this.missionService.getActiveMissions());

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
