/**
 * TutorEngine - Domain Entity
 * 
 * Manages the "Rhythm Game" typing tutor mechanics.
 * 
 * Mechanics:
 * - Non-blocking input: User can keep typing even if wrong.
 * - Match: Advances cursor.
 * - Mismatch: REGRESSION PENALTY (Rewinds progress).
 * - WPM Tracking: Monitors speed for "Too Fast" / "Too Slow" warnings.
 * 
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Storyteller's Code (Literate Documentation)
 */

export type TutorEventType = 'PROGRESS' | 'MISTAKE' | 'COMPLETE' | 'SPEED_WARNING';

export interface TutorEvent {
    type: TutorEventType;
    payload?: any;
}

export interface Lesson {
    id: string;
    text: string;
    type: 'SHELL' | 'VIM_INSERT' | 'VIM_COMMAND';
    instructions: string;
}

const CURRICULUM: Lesson[] = [
    {
        id: 'LESSON_01',
        type: 'SHELL',
        text: 'grep "Urgent" mail.log',
        instructions: 'TYPE THE FOLLOWING COMMAND TO FILTER LOGS:'
    },
    {
        id: 'LESSON_02',
        type: 'SHELL',
        text: 'cd /var/secure/data',
        instructions: 'NAVIGATE TO SECURE STORAGE:'
    },
    {
        id: 'LESSON_03',
        type: 'SHELL',
        text: 'vim secret.txt',
        instructions: 'OPEN THE FILE IN VIM:'
    }
    // More lessons to be added
];

export class TutorEngine {
    private active: boolean = false;
    private currentLesson: Lesson | null = null;
    private progressIndex: number = 0;

    // Rhythm Stats
    private startTime: number = 0;
    private lastKeystrokeTime: number = 0;
    private keystrokes: number[] = []; // Timestamp history for WPM

    private listeners: ((event: TutorEvent) => void)[] = [];

    constructor() { }

    public startLesson(lessonId: string): boolean {
        const lesson = CURRICULUM.find(l => l.id === lessonId);
        if (!lesson) return false;

        this.currentLesson = lesson;
        this.progressIndex = 0;
        this.active = true;
        this.startTime = Date.now();
        this.keystrokes = [];

        return true;
    }

    public stop(): void {
        this.active = false;
        this.currentLesson = null;
    }

    public isActive(): boolean {
        return this.active;
    }

    public getCurrentLesson(): Lesson | null {
        return this.currentLesson;
    }

    public getGhostText(): string {
        if (!this.currentLesson) return '';
        return this.currentLesson.text.substring(this.progressIndex);
    }

    public getCompletedText(): string {
        if (!this.currentLesson) return '';
        return this.currentLesson.text.substring(0, this.progressIndex);
    }

    /**
     * Core Rhythm Mechanic:
     * Handles a keystroke. If match, advance. If mismatch, rewind (penalty).
     */
    public handleInput(char: string): void {
        if (!this.active || !this.currentLesson) return;

        const now = Date.now();
        this.trackSpeed(now);

        const targetChar = this.currentLesson.text[this.progressIndex];

        // 1. Check Exact Match
        if (char === targetChar) {
            this.progressIndex++;
            this.emit({ type: 'PROGRESS', payload: { index: this.progressIndex } });

            // Check Complete
            if (this.progressIndex >= this.currentLesson.text.length) {
                this.completeLesson();
            }
        } else {
            // 2. Mismatch -> REGRESSION PENALTY
            // Rewind by 3 characters (or to 0), "Erasing" progress
            const penalty = 3;
            const oldIndex = this.progressIndex;
            this.progressIndex = Math.max(0, this.progressIndex - penalty);

            this.emit({ type: 'MISTAKE', payload: { dropped: oldIndex - this.progressIndex } });
        }
    }

    private trackSpeed(now: number) {
        // Simple rolling WPM check
        this.keystrokes.push(now);
        if (this.keystrokes.length > 10) this.keystrokes.shift();

        if (this.keystrokes.length >= 2) {
            const duration = now - this.keystrokes[0];
            const chars = this.keystrokes.length;
            const wpm = (chars / 5) / (duration / 60000);

            if (wpm > 80) this.emit({ type: 'SPEED_WARNING', payload: 'TOO FAST' });
            if (wpm < 10) this.emit({ type: 'SPEED_WARNING', payload: 'TOO SLOW' });
        }
    }

    private completeLesson() {
        this.active = false;
        this.emit({ type: 'COMPLETE', payload: this.currentLesson });
        this.currentLesson = null;
    }

    public subscribe(listener: (event: TutorEvent) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private emit(event: TutorEvent) {
        this.listeners.forEach(l => l(event));
    }
}
