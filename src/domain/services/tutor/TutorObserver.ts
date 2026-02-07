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

export type TutorReactionCallback = (action: TutorAction) => void;

export class TutorObserver {
    private reactionListeners: TutorReactionCallback[] = [];

    constructor(
        private bus: SimulationBus,
        private psychAdapter: PsychAdapter
    ) {
        this.initialize();
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

        // 2. Determine Intent based on Event
        const intent = this.determineIntent(event);
        if (!intent) return;

        // 3. Build Context
        const context = ContextBuilder.buildFromEvent(event);

        // 4. Generate Utterance
        const action = CombinatorialUtteranceEngine.generate(
            intent,
            this.psychAdapter.getActiveTone(),
            context,
            INITIAL_TEMPLATE_CATALOG,
            'current-mission' // Fallback or dynamic lookup
        );

        // 5. Notify Listeners (UI/Brain)
        this.reactionListeners.forEach(l => l(action));
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
            
            default:
                return null;
        }
    }

    public onReaction(callback: TutorReactionCallback): void {
        this.reactionListeners.push(callback);
    }
}
