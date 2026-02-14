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
import { AutoPwnStrategy } from './planner/strategies/ExploitStrategies';
import { KnowledgeType } from '../../entities/knowledge/KnowledgeEntity';

export type TutorReactionCallback = (action: TutorAction) => void;

export class TutorObserver {
    private reactionListeners: TutorReactionCallback[] = [];
    private activeMission: Mission | null = null;
    private knowledgeBase: TutorKnowledgeBase = new TutorKnowledgeBase();
    private interpreter: OutputInterpreter = new OutputInterpreter();
    private planner: GOAPPlanner = new GOAPPlanner();
    private currentHost: string = 'terminalator';
    private strategies: ICommandStrategy[] = [
        new NetworkScanStrategy(),
        new FindFileStrategy(),
        new SSHStrategy(),
        new ReadFileStrategy(),
        new GrepContentStrategy(),
        new BuyToolStrategy('autopwn.sh'),
        new BuyToolStrategy('decrypter.bin'),
        new AutoPwnStrategy()
    ];

    constructor(
        private bus: SimulationBus,
        private psychAdapter: PsychAdapter,
        private tutorService: TutorService,
        private fsService: FileSystemService
    ) {
        this.initialize();
    }

    /**
     * Accessor for the Tutor's current perception of the world.
     */
    public getKnowledgeBase(): TutorKnowledgeBase {
        return this.knowledgeBase;
    }

    /**
     * Runs the GOAP planner to find the next optimal step towards the mission goal.
     */
    public triggerPlanning(): void {
        if (!this.activeMission) return;

        // 1. Build Current State
        const knownTypes = new Set<KnowledgeType>(this.knowledgeBase.getAll().map(e => e.type));
        const knownValues = new Set<string>(this.knowledgeBase.getAll().map(e => e.value));
        const knownTools = this.getToolsInBin();

        const start = { knownTypes, knownValues, knownTools, currentHost: this.currentHost };

        // 2. Build Goal State (Derived from mission objective)
        // For now, mapping all missions to "We need a CREDENTIAL (secret)"
        const goal = {
            knownTypes: new Set([KnowledgeType.CREDENTIAL]),
            knownValues: new Set<string>(),
            knownTools: new Set<string>(),
            currentHost: 'any' // Simplified for now
        };

        // 3. Resolve Plan
        const plan = this.planner.plan(start, goal, this.strategies);

        if (plan && plan.length > 0) {
            const nextStep = plan[0] as ICommandStrategy;
            const command = nextStep.generateCommand(this.knowledgeBase);

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
                    instructions: `I've calculated our next move. Use this: ${command}`
                }
            });

            // 5. Generate TutorAction for IRC (Phase 10)
            const reaction: TutorAction = {
                message: `NEXT STEP: ${nextStep.name}. Execute: ${command}`,
                type: 'HINT',
                intent: TutorIntent.NUDGE_PROGRESSION,
                missionId: this.activeMission.id,
                confidence: 1.0
            };
            this.emitReaction(reaction);
        }
    }

    private getToolsInBin(): Set<string> {
        const tools = new Set<string>();
        try {
            const binDir = this.fsService.resolve('/bin') as any;
            if (binDir && binDir.children) {
                binDir.children.forEach((node: any, name: string) => {
                    tools.add(name);
                });
            }
        } catch (e) {}
        return tools;
    }

    public setActiveMission(mission: Mission | null): void {
        this.activeMission = mission;
    }

    private initialize(): void {
        this.bus.subscribe('*', (event) => this.handleEvent(event));
    }

    private handleEvent(event: GameEvent): void {
        // 1. Update Disposition based on Event
        if (event.type === GameEventType.COMMAND_EXECUTED) {
            const success = event.payload.exitCode === 0;
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
                discoveries.forEach(entity => this.knowledgeBase.learn(entity));
                
                // If new knowledge was found, we might want to log it or trigger a specific reaction later
                if (discoveries.length > 0) {
                    console.log(`[TutorObserver] Discovered ${discoveries.length} new knowledge entities.`);
                    this.triggerPlanning(); // Activation (Phase 10)
                }
            }
        }

        // 2. Legacy Hint Check (for archetypal missions)
        if (event.type === GameEventType.COMMAND_EXECUTED && this.activeMission && this.activeMission.type !== 'generative') {
            const legacyHint = this.tutorService.analyzeGameState(
                this.activeMission,
                event.payload.state,
                { 
                    output: event.payload.output, 
                    exitCode: event.payload.exitCode,
                    utility: event.payload.command,
                    newState: event.payload.state
                } as any
            );
            if (legacyHint) {
                if (legacyHint.intent) {
                    // Use generative engine for legacy intent!
                    const context = ContextBuilder.buildFromEvent(event);
                    const generativeAction = CombinatorialUtteranceEngine.generate(
                        legacyHint.intent as any,
                        this.psychAdapter.getActiveTone(),
                        context,
                        INITIAL_TEMPLATE_CATALOG,
                        this.activeMission.id
                    );
                    this.emitReaction(generativeAction);
                } else {
                    this.emitReaction(legacyHint);
                }
                return;
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
