import { ITutorPersona } from './ITutorPersona';

export class TutorBrain {
    public activePersona: ITutorPersona;

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

    process(event: string, context?: any): string {
        return this.activePersona.getReaction(event, context);
    }
}
