export interface TutorMessage {
    readonly text: string;
    readonly type: 'info' | 'warn' | 'hint' | 'critical';
    readonly timestamp: number;
    readonly sender?: string;
}
