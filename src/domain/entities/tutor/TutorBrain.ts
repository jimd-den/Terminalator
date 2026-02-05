import { ITutorPersona } from './ITutorPersona';

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

    constructor() {
        // Default persona placeholder
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
            const chance = exitCode !== 0 ? 0.8 : (this.activePersona.config?.commentChance ?? 0.3);
            
            if (Math.random() < chance) {
                const reaction = this.activePersona.getReaction(event, payload);
                if (reaction && reaction !== '...') {
                    this.emitReaction(reaction, exitCode !== 0 ? 'warn' : 'info');
                }
            }
        } else {
            const reaction = this.activePersona.getReaction(event, payload);
            if (reaction && reaction !== '...') {
                this.emitReaction(reaction, 'info');
            }
        }
    }

    private handleTutorEvent(event: any) {
        // Map TutorEngine events to Persona reactions
        // and handle specific logic like MISSION_START instructions
        
        if (event.type === 'START') {
            const instructions = event.payload?.instructions || 'Awaiting synchronization.';
            this.emitReaction(`MISSION DATA UPLOADED: ${instructions}`, 'info');
            this.emitReaction(this.activePersona.getReaction('MISSION_START'), 'hint');
            return;
        }

        const typeMap: Record<string, string> = {
            'COMPLETE': 'SUCCESS',
            'MISTAKE': 'ERROR_LOW'
        };

        const reactionKey = typeMap[event.type] || event.type;
        const reaction = this.activePersona.getReaction(reactionKey, event.payload);
        
        if (reaction && reaction !== '...') {
            let reactionType = 'info';
            if (event.type === 'MISTAKE') reactionType = 'warn';
            if (event.type === 'COMPLETE') reactionType = 'hint';
            
            // Handle Speed Warnings
            if (event.type === 'SPEED_WARNING') {
                reactionType = event.payload === 'TOO SLOW' ? 'warn' : 'info';
            }

            // Handle Emotions
            if (event.type === 'EMOTION_CHANGE') {
                if (event.payload === 'CRASH_OUT') reactionType = 'critical';
                else if (event.payload === 'MAD') reactionType = 'warn';
            }

            this.emitReaction(reaction, reactionType);
        }
    }

    public onTutorEvent(event: string, payload?: any) {
        const reaction = this.activePersona.getReaction(event, payload);
        if (reaction && reaction !== '...') {
            this.emitReaction(reaction, 'info');
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

    process(event: string, context?: any): string {
        return this.activePersona.getReaction(event, context);
    }
}
