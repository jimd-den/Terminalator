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
import { IntensityCalculator, DialogueIntensity } from '../../services/tutor/IntensityCalculator';
import { MissionIntentInterpreter } from '../../interpreters/MissionIntentInterpreter';

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
    private unsubscribeGame?: () => void;
    private unsubscribeTutor?: () => void;

    constructor(
        private intensityCalculator: IntensityCalculator,
        private intentInterpreter: MissionIntentInterpreter
    ) {
        this.activePersona = {
            id: 'default',
            name: 'Default',
            getReaction: () => '...'
        };
    }

    setPersona(persona: ITutorPersona) {
        this.activePersona = persona;
    }

    public observe(game: IObservableGame) {
        if (this.unsubscribeGame) this.unsubscribeGame();
        this.unsubscribeGame = game.subscribeToEvents((event, payload) => {
            this.handleGameEvent(event, payload);
        });

        if (this.unsubscribeTutor) this.unsubscribeTutor();
        this.unsubscribeTutor = game.tutorEngine.subscribe((event) => {
            this.handleTutorEvent(event);
        });
    }

    private handleGameEvent(event: string, payload?: any) {
        if (event === 'COMMAND_EXECUTED') {
            const exitCode = payload?.exitCode ?? 0;
            const utility = payload?.utility || 'system';
            
            // Increased probability for testing variety
            const chance = exitCode !== 0 ? 0.9 : (this.activePersona.config?.commentChance ?? 0.5);
            
            if (Math.random() < chance) {
                const reactionKey = exitCode !== 0 ? 'fail' : 'success';
                const intensity = this.intensityCalculator.calculate(utility);

                const reaction = this.activePersona.getReaction(reactionKey, {
                    intensity,
                    variables: { utility }
                });

                if (reaction && reaction !== '...') {
                    this.emitReaction(reaction, exitCode !== 0 ? 'warn' : 'info');
                }
            }
        }
    }

    private handleTutorEvent(event: any) {
        if (event.type === 'START') {
            const instructions = event.payload?.instructions || 'Awaiting synchronization.';
            const utility = event.payload?.text?.split(' ')[0] || 'unknown';
            
            this.emitReaction(`MISSION DATA UPLOADED: ${instructions}`, 'info');
            
            // Trigger Combinatorial Mission Start reaction
            const reaction = this.activePersona.getReaction('MISSION_START', {
                intensity: this.intensityCalculator.calculate(utility),
                variables: { utility }
            });
            
            if (reaction && reaction !== '...') {
                this.emitReaction(reaction, 'hint');
            }
            return;
        }

        const typeMap: Record<string, string> = {
            'COMPLETE': 'success',
            'MISTAKE': 'fail'
        };

        const reactionKey = typeMap[event.type] || event.type;
        const intensity = DialogueIntensity.STANDARD;

        const reaction = this.activePersona.getReaction(reactionKey, { intensity });
        
        if (reaction && reaction !== '...') {
            let reactionType = 'info';
            if (event.type === 'MISTAKE') reactionType = 'warn';
            if (event.type === 'COMPLETE') reactionType = 'hint';
            
            this.emitReaction(reaction, reactionType);
        }
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
}
