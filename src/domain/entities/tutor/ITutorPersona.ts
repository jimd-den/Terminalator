export interface ITutorPersona {
    id: string;
    name: string;
    getReaction(event: string, context?: any): string;
    config?: {
        commentChance?: number;
    }
}
