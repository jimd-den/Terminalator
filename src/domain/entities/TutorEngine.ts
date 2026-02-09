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
import { SimulationBus, GameEventType } from '../services/SimulationBus';

export enum InputResult {
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    IGNORED = 'IGNORED'
}

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
    isMission?: boolean; // [NEW] Distinguish from training context
    setup?: (fs: FileSystem) => void;
}


export interface RhythmStats {
    totalHits: number;
    perfectHits: number;
    mistakes: number;
    maxStreak: number;
    accuracy: number;
    totalZincMined: number;
}

export class TutorEngine {
    private active: boolean = false;
    private currentLesson: Lesson | null = null;
    private progressIndex: number = 0;

    // Rhythm Mode
    private bpm: number = 120;
    private nextBeatTime: number = 0;

    // Stats Tracking
    private stats: RhythmStats = {
        totalHits: 0,
        perfectHits: 0,
        mistakes: 0,
        maxStreak: 0,
        accuracy: 100,
        totalZincMined: 0
    };

    // Emotion & Patience
    private patience: number = 100;
    private currentEmotion: TutorEmotion = TutorEmotion.NORMAL;

    private consecutiveMistakes: number = 0;
    private currentStreak: number = 0;

    // Rhythm Stats (Internal)
    private startTime: number = 0;
    private keystrokes: number[] = []; 

    private listeners: ((event: TutorEvent) => void)[] = [];

    constructor(private bus?: SimulationBus) { }

    public startLesson(lesson: Lesson): boolean {
        if (!lesson) return false;

        this.currentLesson = lesson;
        this.progressIndex = 0;
        this.active = true;
        this.startTime = Date.now();
        this.keystrokes = [];
        this.patience = 100;
        this.consecutiveMistakes = 0;
        this.currentStreak = 0;
        
        this.stats = {
            totalHits: 0,
            perfectHits: 0,
            mistakes: 0,
            maxStreak: 0,
            accuracy: 100,
            totalZincMined: 0
        };

        this.bpm = 120; 
        this.nextBeatTime = this.startTime + (60000 / this.bpm);

        this.updateEmotion();

        this.emit({ type: 'START', payload: { ...this.currentLesson, bpm: this.bpm } });
        this.emit({ type: 'PROGRESS', payload: { index: 0, stats: this.stats } });

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

    public getStats(): RhythmStats {
        return { ...this.stats };
    }

    /**
     * Core Rhythm Mechanic:
     * Handles a keystroke. If match, advance. If mismatch, rewind (penalty).
     */
    public handleInput(char: string): InputResult {
        if (!this.active || !this.currentLesson) return InputResult.IGNORED;

        const now = Date.now();
        const targetChar = this.currentLesson.text[this.progressIndex];

        // Rhythm Sync Check
        const beatInterval = 60000 / this.bpm;
        const timeSinceBeat = (now - this.startTime) % beatInterval;
        const isOnBeat = timeSinceBeat < 80 || timeSinceBeat > (beatInterval - 80);

        // 1. Check Exact Match
        if (char === targetChar) {
            this.progressIndex++;
            this.consecutiveMistakes = 0;
            this.currentStreak++;
            this.stats.totalHits++;
            if (isOnBeat) this.stats.perfectHits++;
            if (this.currentStreak > this.stats.maxStreak) this.stats.maxStreak = this.currentStreak;
            
            this.recoverPatience(2);
            this.updateAccuracy();
            
            this.emit({ 
                type: 'PROGRESS', 
                payload: { 
                    index: this.progressIndex,
                    isOnBeat,
                    char,
                    streak: this.currentStreak,
                    stats: this.stats
                } 
            });

            if (this.progressIndex >= this.currentLesson.text.length) {
                this.completeLesson();
            }
            return InputResult.ACCEPTED;
        } else {
            // 2. Mismatch logic
            this.consecutiveMistakes++;
            this.currentStreak = 0;
            this.stats.mistakes++;
            this.updateAccuracy();
            this.updateEmotion();

            if (this.consecutiveMistakes >= 3) {
                this.damagePatience(30);
                const penalty = 5;
                const oldIndex = this.progressIndex;
                this.progressIndex = Math.max(0, this.progressIndex - penalty);

                this.emit({ type: 'MISTAKE', payload: { dropped: oldIndex - this.progressIndex, stats: this.stats } });
                this.consecutiveMistakes = 0;
                this.updateEmotion();
            } else {
                this.damagePatience(10);
                this.emit({ type: 'CORRECTION', payload: { expected: targetChar, actual: char, stats: this.stats } });
            }
            return InputResult.REJECTED;
        }
    }

    private updateAccuracy() {
        const total = this.stats.totalHits + this.stats.mistakes;
        this.stats.accuracy = total > 0 ? (this.stats.totalHits / total) * 100 : 100;
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
        if (this.consecutiveMistakes >= 3) newEmotion = TutorEmotion.CRASH_OUT;
        else if (this.consecutiveMistakes === 2) newEmotion = TutorEmotion.MAD;
        else {
            if (this.patience < 20) newEmotion = TutorEmotion.CRASH_OUT;
            else if (this.patience < 50) newEmotion = TutorEmotion.MAD;
            else if (this.patience < 80) newEmotion = TutorEmotion.RESTLESS;
        }

        if (newEmotion !== this.currentEmotion) {
            this.currentEmotion = newEmotion;
            this.emit({ type: 'EMOTION_CHANGE', payload: newEmotion });
        }
    }

    private completeLesson() {
        this.active = false;
        this.patience = 100;
        this.consecutiveMistakes = 0;
        this.updateEmotion();

        this.emit({ type: 'COMPLETE', payload: { lesson: this.currentLesson, stats: this.stats } });
        this.currentLesson = null;
    }

    public subscribe(listener: (event: TutorEvent) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    public emit(event: TutorEvent) {
        this.listeners.forEach(l => l(event));
        if (this.bus) {
            this.bus.emit(GameEventType.TUTOR_EVENT, event);
        }
    }
}
