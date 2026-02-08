/**
 * IntensityCalculator.ts - Domain Service
 * 
 * Calculates the pedagogical intensity of Tutor dialogue based on
 * the user's mastery of the specific utility in use.
 * 
 * Pillar: THE MASTER'S TOOL (Strategy Pattern)
 * Pillar: THE STORYTELLER'S CODE (Dynamic Dialogue)
 */

import { MasteryTracker, MasteryLevel } from './MasteryTracker';

/**
 * Defines the "heat" of the Tutor's pedagogical approach.
 */
export enum DialogueIntensity {
    GENTLE = 'GENTLE',     // High hand-holding, patient hints.
    STANDARD = 'STANDARD', // Normal interaction.
    HARSH = 'HARSH'        // High mocking, aggressive demands for precision.
}

export class IntensityCalculator {
    constructor(private masteryTracker: MasteryTracker) {}

    /**
     * Determines intensity based on Mastery Gap.
     * Logic: Help the weak, test the strong.
     */
    public calculate(utility: string): DialogueIntensity {
        const level = this.masteryTracker.getLevel(utility);
        
        // Intensity scales UP as mastery increases.
        // The Tutor has no patience for mistakes on tools you "know".
        if (level === 'MASTER') {
            return DialogueIntensity.HARSH;
        }
        
        if (level === 'COMPETENT') {
            return DialogueIntensity.STANDARD;
        }

        return DialogueIntensity.GENTLE;
    }
}
