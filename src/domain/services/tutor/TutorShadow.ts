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
            } else if (data && data.type === 'COMPLETE') {
                this.isSummaryActive = true;
            } else if (data && data.type === 'SUMMARY_DISMISSED') {
                this.isSummaryActive = false;
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
        // 0. Check Summary Mode (Blocking)
        if (this.isSummaryActive) {
            // Only allow ENTER to pass (which will be caught by RhythmHUD via InputContext override, 
            // but we need to ensure it doesn't leak to Shell if HUD doesn't catch it?)
            // Actually, RhythmHUD uses useInput's setOnKeyPress which might be parallel to this?
            // No, ShellScreen calls handleKeyPress which calls this.
            
            // If RhythmHUD is capturing input via setOnKeyPress, it might stop propagation?
            // The Architecture uses ShellScreen -> handleKeyPress -> TutorShadow.
            // If RhythmHUD sets a global listener, it might run INSTEAD or BEFORE.
            // But let's be safe: Block everything here.
            console.log("[TutorShadow] Blocking input due to SUMMARY_MODE");
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
        if (!lesson) {
            console.log("[TutorShadow] Engine active but no lesson? Pass through.");
            return true;
        }

        console.log(`[TutorShadow] Lesson active: ${lesson.id}. Target: ${lesson.text[this.engine.getCompletedText().length]}`);

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
