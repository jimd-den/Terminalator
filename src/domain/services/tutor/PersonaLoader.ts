import { ITutorPersona } from '../../entities/tutor/ITutorPersona';

export interface PersonaData {
    id: string;
    name: string;
    lines: Record<string, string[]>;
}

export class PersonaLoader implements ITutorPersona {
    public id: string;
    public name: string;
    private lines: Record<string, string[]>;

    constructor(data: PersonaData) {
        this.id = data.id;
        this.name = data.name;
        this.lines = data.lines;
    }

    getReaction(event: string): string {
        const set = this.lines[event];
        if (!set || set.length === 0) return "...";
        return set[Math.floor(Math.random() * set.length)];
    }
}
