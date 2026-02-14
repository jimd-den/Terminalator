/**
 * TutorShadow - Domain Service
 * 
 * The ultimate "Gatekeeper" for keyboard input.
 * Implements Phase III: Shadow Architecture (Input Gating).
 * 
 * Pillar: THE SHADOW'S VEIL (Interception)
 * Pillar: THE Swift Stream (Performance)
 * 
 * Intent:
 * Physically enforces discipline by consuming "heretical" keystrokes.
 * Integrates mining directly into the input flow.
 */

import { TutorEngine, InputResult } from '../../entities/TutorEngine';
import { EconomyService } from '../EconomyService';
import { SimulationBus, GameEventType } from '../SimulationBus';
import { PresentationDirector } from '../PresentationDirector';
import { RhythmConductor } from '../RhythmConductor';

export class TutorShadow {
    private currentBeatTime: number = 0;
    private isSummaryActive: boolean = false;
    private isCountdownActive: boolean = false;

    constructor(
        private engine: TutorEngine,
        private economy: EconomyService,
        private bus: SimulationBus,
        private director: PresentationDirector,
        private conductor: RhythmConductor
    ) {
        this.bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
            const data = event.payload;
            if (data && data.type === 'RHYTHM_TICK') {
                this.currentBeatTime = data.payload.timestamp;
            } else if (data && data.type === 'RHYTHM_START') {
                this.conductor.start(data.payload.bpm);
            } else if (data && data.type === 'RHYTHM_STOP') {
                this.conductor.stop();
            } else if (data && data.type === 'COMPLETE') {
                this.isSummaryActive = true;
                this.conductor.stop();
            } else if (data && data.type === 'SUMMARY_DISMISSED') {
                this.isSummaryActive = false;
            } else if (data && data.type === 'COUNTDOWN_START') {
                this.isCountdownActive = true;
            } else if (data && data.type === 'COUNTDOWN_COMPLETE') {
                this.isCountdownActive = false;
            }
        });
    }

    /**
     * Intercepts a keystroke.
     * @param key - The key pressed.
     * @param mode - 'SHELL' or 'VIM'.
     * @returns true if the key is allowed through, false if it's consumed/blocked.
     */
    public intercept(key: string, mode: 'SHELL' | 'VIM' = 'SHELL'): boolean {
        // 0. Check Summary or Countdown Mode (Blocking)
        if (this.isSummaryActive || this.isCountdownActive) {
            if (this.isSummaryActive && key === 'ENTER') {
                this.bus.emit(GameEventType.TUTOR_EVENT, { type: 'SUMMARY_ENTER_PRESSED' });
            }
            console.log(`[TutorShadow] Blocking input due to ${this.isSummaryActive ? 'SUMMARY' : 'COUNTDOWN'}_MODE`);
            return false; 
        }

        console.log(`[TutorShadow] Intercepting key: "${key}" (mode: ${mode}). Current Beat: ${this.currentBeatTime}`);
        // 1. Check if engine is active
        if (!this.engine.isActive()) {
            console.log("[TutorShadow] Engine NOT active. Pass through.");
            // Free play mining
            if (key.length === 1) {
                this.economy.recordHit();
                this.bus.emit(GameEventType.KEYSTROKE_ACCEPTED, { key });
            }
            return true; // Pass through
        }

        const lesson = this.engine.getCurrentLesson();
        if (!lesson || !lesson.text) {
            console.log("[TutorShadow] Engine active but no valid lesson text? Pass through.");
            return true;
        }

        console.log(`[TutorShadow] Lesson active: ${lesson.id}. Target: ${lesson.text?.[this.engine.getCompletedText().length] || 'NONE'}`);

        // 2. Strict Gating (Rail Shooter Mechanic)
        // Control keys might be blocked or allowed based on lesson type
        if (key === 'ENTER' || key === 'BACKSPACE' || key === 'TAB') {
            if (lesson.type === 'SHELL' && key === 'BACKSPACE') {
                this.recordFailure();
                return false; // No backspacing in rail shooter mode
            }
            return true;
        }

        if (key.length !== 1) return true; // Function keys etc.

        // 3. Delegate to Engine
        // Engine handles state update on ACCEPTED/REJECTED
        const result = this.engine.handleInput(key);
        console.log(`[TutorShadow] Engine Result for ${key}: ${result}`);

        if (result === InputResult.ACCEPTED) {
            this.economy.recordHit(this.currentBeatTime);
            // Sync session reward back to engine so summary reflects it
            this.engine.setSessionZinc(this.economy.getSession().sessionZincMined);
            this.bus.emit(GameEventType.KEYSTROKE_ACCEPTED, { key });
            return true; 
        } else if (result === InputResult.REJECTED) {
            this.economy.recordMistake();
            // Engine already emits MISTAKE event which UI listens to
            return false;
        }

        return true;
    }

    private recordFailure() {
        this.economy.recordMistake();
        this.bus.emit(GameEventType.TUTOR_EVENT, { 
            type: 'MISTAKE', 
            payload: { type: 'SHADOW_BLOCK', message: 'HERESY DETECTED', dropped: 0 } 
        });
    }
}
