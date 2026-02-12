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

export type TutorReactionCallback = (action: TutorAction) => void;

export class TutorObserver {
    private reactionListeners: TutorReactionCallback[] = [];
    private activeMission: Mission | null = null;

    constructor(
        private bus: SimulationBus,
        private psychAdapter: PsychAdapter,
        private tutorService: TutorService
    ) {
        this.initialize();
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
                this.emitReaction(legacyHint);
                // If legacy hint handled it, we might want to skip generative logic
                // But for now we allow both or prioritize legacy.
                return;
            }
        }

        // 3. Determine Intent based on Event (Generative Flow)
        const intent = this.determineIntent(event);
        if (!intent) return;

        // 3. Probabilistic Filtering (Moved from Brain to Observer)
        if (this.shouldSilence(event, intent)) return;

        // 4. Build Context
        const context = ContextBuilder.buildFromEvent(event);

        // 5. Generate Utterance
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
            
            case GameEventType.TUTOR_EVENT:
                if (event.payload.type === 'START') return TutorIntent.NUDGE_PROGRESSION;
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
