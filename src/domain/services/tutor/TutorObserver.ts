/**
 * TutorObserver.ts
 *
 * Pillar: THE BALANCED SCALE (Observer Pattern)
 * Pillar: THE STORYTELLER’S CODE (Dispositional Feedback)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Service
 *
 * Intent:
 * The primary glue service for the Dispositional AI.
 * It listens to the SimulationBus, processes events through the PsychAdapter,
 * and triggers generative dialogue via the UtteranceEngine.
 */

import { SimulationBus, GameEvent, GameEventType } from '../SimulationBus';
import { PsychAdapter } from './PsychAdapter';
import { CombinatorialUtteranceEngine } from './CombinatorialUtteranceEngine';
import { ContextBuilder } from './ContextBuilder';
import { INITIAL_TEMPLATE_CATALOG } from '../../data/tutor/TemplateCatalog';
import { TutorIntent } from '../../entities/tutor/TutorIntent';
import { TutorAction } from '../../interfaces/ITutorService';
import { Mission } from '../../entities/Mission';
import { TutorService } from '../TutorService';
import { OutputInterpreter } from '../../interpreters/tutor/OutputInterpreter';
import { FileSystemService } from '../FileSystemService';
import { TutorKnowledgeBase } from '../../entities/knowledge/TutorKnowledgeBase';
import { GOAPPlanner } from './planner/GOAPPlanner';
import { ICommandStrategy } from './planner/ICommandStrategy';
import { NetworkScanStrategy, FindFileStrategy, SSHStrategy } from './planner/strategies/ReconStrategies';
import { ReadFileStrategy, GrepContentStrategy } from './planner/strategies/ExfilStrategies';
import { BuyToolStrategy } from './planner/strategies/EconomyStrategies';
import { BypassStrategy } from './planner/strategies/ExploitStrategies';
import { KnowledgeType } from '../../entities/knowledge/KnowledgeEntity';

export type TutorReactionCallback = (action: TutorAction) => void;

export class TutorObserver {
    private reactionListeners: TutorReactionCallback[] = [];
    private activeMission: Mission | null = null;
    private knowledgeBase: TutorKnowledgeBase;
    private interpreter: OutputInterpreter = new OutputInterpreter();
    private planner: GOAPPlanner = new GOAPPlanner();
    private currentHost: string = 'terminalator';
    private strategies: ICommandStrategy[] = [
        new NetworkScanStrategy(),
        new FindFileStrategy(),
        new SSHStrategy(),
        new ReadFileStrategy(),
        new GrepContentStrategy(),
        new BuyToolStrategy('bypass.sh'),
        new BuyToolStrategy('decrypter.bin'),
        new BypassStrategy()
    ];

    constructor(
        private bus: SimulationBus,
        private psychAdapter: PsychAdapter,
        private tutorService: TutorService,
        private fsService: FileSystemService
    ) {
        this.knowledgeBase = new TutorKnowledgeBase();
        // Initial system knowledge (Pillar: Perception)
        this.knowledgeBase.learn({
            type: KnowledgeType.METADATA,
            value: 'SYSTEM_ROOT',
            discoveredAt: Date.now(),
            source: 'INITIALIZATION',
            isBelief: false
        });
        this.initialize();
    }

    /**
     * Accessor for the Tutor's current perception of the world.
     */
    public getKnowledgeBase(): TutorKnowledgeBase {
        return this.knowledgeBase;
    }

    /**
     * Updates the filesystem service reference.
     */
    public setFileSystemService(service: FileSystemService): void {
        this.fsService = service;
    }

    /**
     * Runs the GOAP planner to find the next optimal step towards the mission goal.
     */
    public triggerPlanning(): void {
        if (!this.activeMission) return;

        // Refresh BELIEFS about physical world before planning (Phase 10 fix)
        const knownTools = this.getToolsInBin();

        // 1. Build Current State
        const knownTypes = new Set<KnowledgeType>(this.knowledgeBase.getAll().map(e => e.type));
        const knownValues = new Set<string>(this.knowledgeBase.getAll().map(e => e.value));

        const start = { 
            knownTypes, 
            knownValues, 
            knownTools, 
            currentHost: this.currentHost,
            targetHost: this.activeMission.targetSystem 
        };

        console.log(`[TutorObserver] Planning for mission ${this.activeMission.id}. Goal Target: ${this.activeMission.targetSystem}. Current Host: ${this.currentHost}. Known Types: ${Array.from(knownTypes).join(',')}`);

        // 2. Build Goal State (Derived from mission objective)
        // Heuristic: If we don't have CREDENTIAL, we need it. 
        // If we have CREDENTIAL, we need to apply it (e.g. FindFile or Grep on target)
        const needsCredential = !knownTypes.has(KnowledgeType.CREDENTIAL);
        const needsPaths = !knownTypes.has(KnowledgeType.PATH);

        const goalTypes = new Set<KnowledgeType>();
        const goalValues = new Set<string>();

        if (needsCredential) goalTypes.add(KnowledgeType.CREDENTIAL);
        else if (needsPaths) goalTypes.add(KnowledgeType.PATH);
        else {
            goalTypes.add(KnowledgeType.MISSION_OBJECTIVE);
            goalValues.add(`MISSION_DATA_ACQUIRED`);
        }

        const goal = {
            knownTypes: goalTypes,
            knownValues: goalValues,
            knownTools: new Set<string>(),
            currentHost: this.activeMission.targetSystem || 'any',
            targetHost: this.activeMission.targetSystem
        };

        console.log(`[TutorObserver] GOAL HOST set to: ${goal.currentHost}`);

        // 3. Resolve Plan
        const plan = this.planner.plan(start, goal, this.strategies);

        if (plan && plan.length > 0) {
            const nextStep = plan[0] as ICommandStrategy;
            const command = nextStep.generateCommand(this.knowledgeBase, this.activeMission.targetSystem);

            if (!command) {
                console.warn(`[TutorObserver] Strategy ${nextStep.name} generated an empty command.`);
                return;
            }

            console.log(`[TutorObserver] New Plan Resolved. Next step: ${nextStep.name}. Command: ${command}`);

            // 4. Emit special event for RhythmHUD or TutorBrain to suggest this
            this.bus.emit(GameEventType.TUTOR_EVENT, {
                type: 'PLAN_UPDATED',
                payload: {
                    plan: plan.map(s => s.name),
                    nextCommand: command,
                    suggestedCommand: command,
                    instructions: `I've calculated our next move. Use this: ${command}`
                }
            });

            // 5. Generate TutorAction for IRC (Phase 10)
            const reaction: TutorAction = {
                message: `NEXT STEP: ${nextStep.name}. Execute: ${command}`,
                type: 'HINT',
                intent: TutorIntent.NUDGE_PROGRESSION,
                missionId: this.activeMission.id,
                confidence: 1.0,
                suggestedCommand: command
            };
            this.emitReaction(reaction);
        } else if (this.activeMission) {
            // FALLBACK: If no plan found but mission active, suggest scanning or comms
            const fallbackCmd = knownTypes.has(KnowledgeType.HOSTNAME) ? 'net-scan' : 'check-comms';
            
            // Emit PLAN_UPDATED for RhythmHUD visibility
            this.bus.emit(GameEventType.TUTOR_EVENT, {
                type: 'PLAN_UPDATED',
                payload: {
                    plan: [fallbackCmd.toUpperCase()],
                    nextCommand: fallbackCmd,
                    suggestedCommand: fallbackCmd,
                    instructions: `I'm lost. Try synchronized connection: ${fallbackCmd}`
                }
            });

            this.emitReaction({
                message: `I'm lost. Try synchronized connection: ${fallbackCmd}`,
                type: 'HINT',
                intent: TutorIntent.NUDGE_PROGRESSION,
                missionId: this.activeMission.id,
                confidence: 0.5,
                suggestedCommand: fallbackCmd
            });
        }
    }

    private getToolsInBin(): Set<string> {
        const tools = new Set<string>();
        const candidates = ['bypass.sh', 'decrypter.bin', 'net-scan', 'transfer', 'check-comms', 'grep', 'awk', 'sed', 'cat', 'ls', 'cd'];
        candidates.forEach(t => {
            try {
                const node = this.fsService.resolve(`/bin/${t}`);
                if (node) {
                    tools.add(t);
                }
            } catch (e) {}
        });
        return tools;
    }

    public setActiveMission(mission: Mission | null): void {
        this.activeMission = mission;
    }

    private initialize(): void {
        this.bus.subscribe('*', (event) => this.handleEvent(event));
    }

    private handleEvent(event: GameEvent): void {
        // 0. Mission Activation (Sync Knowledge)
        if (event.type === GameEventType.MISSION_PROGRESS) {
            if (event.payload.type === 'CREATED') {
                this.triggerPlanning();
            } else if (event.payload.type === 'COMPLETED') {
                console.log(`[TutorObserver] Mission ${event.payload.missionId} COMPLETED. Clearing state.`);
                this.activeMission = null;
            }
        }

        // 1. Update Disposition based on Event
        if (event.type === GameEventType.COMMAND_EXECUTED) {
            const success = event.payload.exitCode === 0;
            if (event.payload.state?.fsContext) {
                this.currentHost = event.payload.state.fsContext;
            } else {
                this.currentHost = 'terminalator';
            }
            this.psychAdapter.recordEvent(success ? 'SUCCESS' : 'ERROR');

            if (event.payload.state) {
                this.currentHost = event.payload.state.fsContext || 'terminalator';
            }

            // --- SENSORY INPUT PROCESSING (Phase 4) ---
            if (success && event.payload.output) {
                const discoveries = this.interpreter.interpret(
                    event.payload.command, 
                    event.payload.output
                );
                discoveries.forEach(entity => {
                    console.log(`[TutorObserver] LEARNED: ${entity.type}=${entity.value}`);
                    this.knowledgeBase.learn(entity);
                });
                
                // If new knowledge was found, we might want to log it or trigger a specific reaction later
                if (discoveries.length > 0) {
                    console.log(`[TutorObserver] Discovered ${discoveries.length} new knowledge entities.`);
                }
                this.triggerPlanning(); // Trigger plan update after every success
            }
        }

        // 3. Determine Intent based on Event (Generative Flow)
        const intent = this.determineIntent(event);
        if (!intent) return;

        // 4. Probabilistic Filtering (Moved from Brain to Observer)
        if (this.shouldSilence(event, intent)) return;

        // 5. Build Context
        const context = ContextBuilder.buildFromEvent(event);
        if (event.type === GameEventType.TUTOR_EVENT && event.payload.type === 'START') {
            context.lessonText = event.payload.text;
            context.target = this.activeMission?.targetSystem || 'unknown';
        }

        if (event.type === GameEventType.PERSONA_SWITCHED) {
            context.personaName = event.payload.name;
        }

        // 6. Generate Utterance
        const action = CombinatorialUtteranceEngine.generate(
            intent,
            this.psychAdapter.getActiveTone(),
            context,
            INITIAL_TEMPLATE_CATALOG,
            this.activeMission?.id || 'system-context'
        );

        // 6. Notify Listeners (UI/Brain)
        this.emitReaction(action);
    }

    private shouldSilence(event: GameEvent, intent: TutorIntent): boolean {
        // High priority events always pass
        if (event.type === GameEventType.COMMAND_EXECUTED && event.payload.exitCode !== 0) return false;
        if (intent === TutorIntent.CELEBRATE_SUCCESS) return false;

        // Otherwise 50% chance to be quiet to avoid annoyance
        return Math.random() > 0.5;
    }

    private determineIntent(event: GameEvent): TutorIntent | null {
        switch (event.type) {
            case GameEventType.COMMAND_EXECUTED:
                if (event.payload.exitCode !== 0) return TutorIntent.REPRIMAND_MISTAKE;
                
                // Specific Nudges for milestones
                if (event.payload.command === 'ssh') return TutorIntent.NUDGE_PROGRESSION;
                
                return null;
            
            case GameEventType.REGISTER_MODIFIED:
                // Only react if value is "interesting" or a specific milestone
                if (event.payload.newValue === 0xDEADBEEF) return TutorIntent.CELEBRATE_SUCCESS;
                return TutorIntent.EXPLAIN_COMMAND;

            case GameEventType.MISSION_PROGRESS:
                return TutorIntent.CELEBRATE_SUCCESS;
            
            case GameEventType.SYSTEM_BOOT:
                return TutorIntent.SYSTEM_BOOT;
            
            case GameEventType.PERSONA_SWITCHED:
                return TutorIntent.PERSONA_INITIALIZED;
            
            case GameEventType.TUTOR_EVENT:
                if (event.payload.type === 'START') {
                    return (event.payload.tutorIntent as TutorIntent) || TutorIntent.NUDGE_PROGRESSION;
                }
                if (event.payload.type === 'COMPLETE') return TutorIntent.CELEBRATE_SUCCESS;
                return null;
            
            default:
                return null;
        }
    }

    private emitReaction(action: TutorAction): void {
        this.reactionListeners.forEach(l => l(action));
    }

    public onReaction(callback: TutorReactionCallback): () => void {
        this.reactionListeners.push(callback);
        return () => {
            this.reactionListeners = this.reactionListeners.filter(l => l !== callback);
        };
    }
}
