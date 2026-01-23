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

import { FileSystem } from './FileSystem';
import { FileSystemService } from '../services/FileSystemService';

export enum TutorEmotion {
    NORMAL = 'NORMAL',
    RESTLESS = 'RESTLESS',
    MAD = 'MAD',
    CRASH_OUT = 'CRASH_OUT'
}

export type TutorEventType = 'START' | 'STOP' | 'PROGRESS' | 'MISTAKE' | 'COMPLETE' | 'SPEED_WARNING' | 'EMOTION_CHANGE' | 'CORRECTION';

export interface TutorEvent {
    type: TutorEventType;
    payload?: any;
}

export interface Lesson {
    id: string;
    text: string;
    type: 'SHELL' | 'VIM_INSERT' | 'VIM_COMMAND';
    instructions: string;
    setup?: (fs: FileSystem) => void;
}

const CURRICULUM: Lesson[] = [
    {
        id: 'LESSON_01',
        type: 'SHELL',
        text: 'grep "Urgent" mail.log',
        instructions: 'TYPE THE FOLLOWING COMMAND TO FILTER LOGS:',
        setup: (fs: FileSystem) => {
            const service = new FileSystemService(fs);
            service.writeFile('/home/user/mail.log', 'Info: Normal operation\nWarning: Disk space low\nUrgent: Security breach detected\nInfo: Service started');
        }
    },
    {
        id: 'LESSON_02',
        type: 'SHELL',
        text: 'cd /var/secure/data',
        instructions: 'NAVIGATE TO SECURE STORAGE:',
        setup: (fs: FileSystem) => {
            const service = new FileSystemService(fs);
            service.createDirectory('/var/secure/data');
        }
    },
    {
        id: 'LESSON_03',
        type: 'SHELL',
        text: 'vim secret.txt',
        instructions: 'OPEN THE FILE IN VIM:',
        setup: (fs: FileSystem) => {
            const service = new FileSystemService(fs);
            service.writeFile('/home/user/secret.txt', 'This is a top secret file.');
        }
    }
    // More lessons to be added
];

export class TutorEngine {
    private active: boolean = false;
    private currentLesson: Lesson | null = null;
    private progressIndex: number = 0;

    // Emotion & Patience
    private patience: number = 100;
    private currentEmotion: TutorEmotion = TutorEmotion.NORMAL;

    private consecutiveMistakes: number = 0;

    // Rhythm Stats
    private startTime: number = 0;
    private lastKeystrokeTime: number = 0;
    private keystrokes: number[] = []; // Timestamp history for WPM

    private listeners: ((event: TutorEvent) => void)[] = [];

    constructor() { }

    public startLesson(lessonOrId: string | Lesson, fs: FileSystem): boolean {
        let lesson: Lesson | undefined;

        if (typeof lessonOrId === 'string') {
            lesson = CURRICULUM.find(l => l.id === lessonOrId);
        } else {
            lesson = lessonOrId;
        }

        if (!lesson) return false;

        this.currentLesson = lesson;
        this.progressIndex = 0;
        this.active = true;
        this.startTime = Date.now();
        this.keystrokes = [];
        this.patience = 100;
        this.consecutiveMistakes = 0;

        // Execute Setup
        if (lesson.setup) {
            if (!fs) {
                console.error("TutorEngine: Cannot execute lesson setup. FileSystem argument is missing.");
                return false;
            }
            try {
                lesson.setup(fs);
            } catch (error: any) {
                console.error("TutorEngine: Error during lesson setup:", error.message);
                return false;
            }
        }

        this.updateEmotion();

        return true;
    }

    public stop(): void {
        this.active = false;
        this.currentLesson = null;
        this.patience = 100;
        this.consecutiveMistakes = 0;
        this.updateEmotion();
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

    public getEmotion(): TutorEmotion {
        return this.currentEmotion;
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
            this.consecutiveMistakes = 0; // Reset streak
            this.recoverPatience(2); // Small recovery
            this.emit({ type: 'PROGRESS', payload: { index: this.progressIndex } });

            // Check Complete
            if (this.progressIndex >= this.currentLesson.text.length) {
                this.completeLesson();
            }
        } else {
            // 2. Mismatch logic
            this.consecutiveMistakes++;
            this.updateEmotion(); // Immediately update emotion based on streak

            if (this.consecutiveMistakes >= 3) {
                // STRIKE THREE: CRASH OUT / REGRESSION
                this.damagePatience(30); // Major hit

                // Rewind logic
                const penalty = 5; // Erase a couple characters (5)
                const oldIndex = this.progressIndex;
                this.progressIndex = Math.max(0, this.progressIndex - penalty);

                this.emit({ type: 'MISTAKE', payload: { dropped: oldIndex - this.progressIndex } });
                this.consecutiveMistakes = 0; // Reset streak after punishment
                this.updateEmotion(); // Update again
            } else {
                // NORMAL MISTAKE: Warning / Correction
                this.damagePatience(10);
                // Emit Correction Event (UI should show angry backspace)
                this.emit({ type: 'CORRECTION', payload: { expected: targetChar, actual: char } });
            }
        }
    }

    private damagePatience(amount: number) {
        this.patience = Math.max(0, this.patience - amount);
        this.updateEmotion();
    }

    private recoverPatience(amount: number) {
        this.patience = Math.min(100, this.patience + amount);
        this.updateEmotion();
    }

    private updateEmotion() {
        let newEmotion = TutorEmotion.NORMAL;

        // Strict Strike Logic Overrides Patience
        if (this.consecutiveMistakes >= 3) {
            newEmotion = TutorEmotion.CRASH_OUT;
        } else if (this.consecutiveMistakes === 2) {
            newEmotion = TutorEmotion.MAD;
        } else {
            // Fallback to General Patience
            if (this.patience < 20) {
                newEmotion = TutorEmotion.CRASH_OUT;
            } else if (this.patience < 50) {
                newEmotion = TutorEmotion.MAD;
            } else if (this.patience < 80) {
                newEmotion = TutorEmotion.RESTLESS;
            }
        }

        if (newEmotion !== this.currentEmotion) {
            this.currentEmotion = newEmotion;
            this.emit({ type: 'EMOTION_CHANGE', payload: newEmotion });
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

        // Calming down
        this.patience = 100;
        this.consecutiveMistakes = 0;
        this.updateEmotion();

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
