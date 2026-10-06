/**
 * TutorBrain - Domain Entity / Bridge
 * 
 * Orchestrates persona reactions and pedagogical intensity.
 * Bridges low-level terminal events to high-level NPC dialogue.
 * 
 * Pillar: THE STORYTELLER'S CODE (Persona Orchestration)
 * Pillar: THE MASTER'S TOOL (Interpreter & Intensity)
 */

import { ITutorPersona } from './ITutorPersona';
import { IntensityCalculator } from '../../services/tutor/IntensityCalculator';
import { MissionIntentInterpreter } from '../../interpreters/MissionIntentInterpreter';
import { SimulationBus, GameEvent, GameEventType } from '../../services/SimulationBus';
import { AdaptiveTutorEngine } from '../../services/tutor/AdaptiveTutorEngine';
import { PsychAdapter } from '../../services/tutor/PsychAdapter';
import { UnixKnowledgeBase } from '../../services/knowledge/UnixKnowledgeBase';
import { TutorIntent } from './TutorIntent';
import { Mission } from '../Mission';

export interface IObservableGame {
    subscribeToEvents(listener: (event: string, payload?: any) => void): () => void;
    tutorEngine: IObservableTutor;
}

export interface IObservableTutor {
    subscribe(listener: (event: any) => void): () => void;
}

export type BrainReactionListener = (text: string, type: string) => void;

export class TutorBrain {
    public activePersona: ITutorPersona;
    private reactionListeners: BrainReactionListener[] = [];
    private psychAdapter: PsychAdapter;
    private adaptiveEngine: AdaptiveTutorEngine;
    private idleTimer?: NodeJS.Timeout;
    private lastEventTime: number = Date.now();
    private activeMission: Mission | null = null;

    constructor(
        private intensityCalculator: IntensityCalculator,
        private intentInterpreter: MissionIntentInterpreter,
        private bus: SimulationBus
    ) {
        this.psychAdapter = new PsychAdapter();
        // Ideally KB should be injected, but for now we instantiate here to move fast
        const kb = new UnixKnowledgeBase(); 
        this.adaptiveEngine = new AdaptiveTutorEngine(kb);
        
        this.activePersona = {
            id: 'default',
            name: 'Default',
            getReaction: () => '...'
        };
        this.initialize();
        this.startIdleTimer();
    }

    public setActiveMission(mission: Mission | null) {
        this.activeMission = mission;
    }

    private initialize() {
        // Legacy: Observation now happens via the TutorObserver.
        // this.bus.subscribe('*', (event) => {
        //     this.lastEventTime = Date.now();
        //     this.handleEvent(event);
        // });
    }

    private startIdleTimer() {
        if (this.idleTimer) clearInterval(this.idleTimer);
        this.idleTimer = setInterval(() => {
            const idleTime = Date.now() - this.lastEventTime;
            if (idleTime > 20000) { // 20 seconds of silence
                this.triggerIdleObservation();
                this.lastEventTime = Date.now(); // Reset to prevent spam
            }
        }, 5000);
    }

    private triggerIdleObservation() {
        const action = this.adaptiveEngine.generateAdvice(
            TutorIntent.IDLE_OBSERVATION,
            this.psychAdapter.getActiveTone(),
            { id: 'M-IDLE', currentStepId: 'idle', grammar: { steps: [] } } as any
        );
        if (action.message) {
            this.emitReaction(action.message, 'info');
        }
    }

    private handleEvent(event: GameEvent) {
        // 1. Update Disposition
        if (event.type === GameEventType.COMMAND_EXECUTED) {
            const success = event.payload.exitCode === 0;
            this.psychAdapter.recordEvent(success ? 'SUCCESS' : 'ERROR');
        } else if (event.type === GameEventType.TUTOR_EVENT && event.payload.type === 'MISTAKE') {
            this.psychAdapter.recordEvent('ERROR');
        }

        // 2. Determine Intent
        const intent = this.determineIntent(event);
        if (!intent) return;

        // 3. Probabilistic Filtering (Optional - Based on persona)
        const chance = this.activePersona.config?.commentChance ?? 0.5;
        // Errors and Boot always have high chance
        const isHighPriority = (event.type === GameEventType.COMMAND_EXECUTED && event.payload.exitCode !== 0) || 
                               (event.type === GameEventType.TUTOR_EVENT && event.payload.type === 'SYSTEM_BOOT');
        
        const effectiveChance = isHighPriority ? 1.0 : chance;
        
        if (Math.random() > effectiveChance) return;

        // 4. Generate Adaptive Utterance
        if (!this.activeMission) return;

        const action = this.adaptiveEngine.generateAdvice(
            intent,
            this.psychAdapter.getActiveTone(),
            this.activeMission, 
            event.payload?.command
        );

        if (action.message) {
            this.emitReaction(action.message, action.severity?.toLowerCase() || 'info');
        }
    }

    private determineIntent(event: GameEvent): TutorIntent | null {
        switch (event.type) {
            case GameEventType.COMMAND_EXECUTED:
                if (event.payload.exitCode !== 0) return TutorIntent.REPRIMAND_MISTAKE;
                // SSH nudges
                if (event.payload.command === 'ssh') return TutorIntent.NUDGE_PROGRESSION;
                return null;
            
            case GameEventType.TUTOR_EVENT:
                if (event.payload.type === 'START') return TutorIntent.NUDGE_PROGRESSION;
                if (event.payload.type === 'COMPLETE') return TutorIntent.CELEBRATE_SUCCESS;
                if (event.payload.type === 'MISTAKE') return TutorIntent.REPRIMAND_MISTAKE;
                if (event.payload.type === 'SYSTEM_BOOT') return TutorIntent.SYSTEM_BOOT;
                if (event.payload.type === 'CORRECTION') return TutorIntent.ACCURACY_CRITIQUE;
                if (event.payload.type === 'SPEED_WARNING') return TutorIntent.RHYTHM_REPORT;
                if (event.payload.type === 'PROGRESS' && event.payload.index % 10 === 0) return TutorIntent.INPUT_PROGRESS;
                return null;

            case GameEventType.REGISTER_MODIFIED:
                if (event.payload.newValue === 0xDEADBEEF) return TutorIntent.CELEBRATE_SUCCESS;
                return TutorIntent.EXPLAIN_COMMAND;

            case GameEventType.MISSION_PROGRESS:
                return TutorIntent.CELEBRATE_SUCCESS;

            default:
                return null;
        }
    }

    setPersona(persona: ITutorPersona) {
        this.activePersona = persona;
    }

    public observe(game: IObservableGame) {
        // Legacy: Observation now happens via the Bus in constructor.
    }

    private emitReaction(text: string, type: string) {
        this.reactionListeners.forEach(l => l(text, type));
    }

    public subscribe(listener: BrainReactionListener): () => void {
        this.reactionListeners.push(listener);
        return () => {
            this.reactionListeners = this.reactionListeners.filter(l => l !== listener);
        };
    }

    public dispose() {
        if (this.idleTimer) {
            clearInterval(this.idleTimer);
            this.idleTimer = undefined;
        }
    }
}
