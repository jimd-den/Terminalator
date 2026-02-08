/**
 * PersonalityMatrix.ts
 *
 * Pillar: THE STORYTELLER’S CODE (Dispositional AI)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Entities
 *
 * Intent:
 * Represents the psychological state of the Tutor AI using the Big Five (OCEAN) model.
 * Transitions in this matrix drive the change in ToneProfile.
 */

import { TutorToneProfile } from './TutorToneProfile';

export interface BigFive {
    /** Openness: Curiosity vs. Consistency */
    openness: number; 
    /** Conscientiousness: Efficiency vs. Easy-going */
    conscientiousness: number;
    /** Extraversion: Outgoing vs. Solitary */
    extraversion: number;
    /** Agreeableness: Friendly vs. Critical */
    agreeableness: number;
    /** Neuroticism: Sensitive vs. Secure */
    neuroticism: number;
}

export class PersonalityMatrix {
    constructor(public traits: BigFive) {}

    /**
     * Maps the current OCEAN traits to the dominant ToneProfile.
     */
    public getDominantTone(): TutorToneProfile {
        const { agreeableness, neuroticism, conscientiousness, extraversion, openness } = this.traits;

        if (neuroticism > 0.8 && agreeableness < 0.3) return TutorToneProfile.SNARKY_SYSADMIN;
        if (agreeableness > 0.7 && neuroticism < 0.4) return TutorToneProfile.GENTLE_GUIDE;
        if (conscientiousness > 0.8 && extraversion < 0.4) return TutorToneProfile.CORPORATE_DRONE;
        if (extraversion > 0.7 && openness > 0.7) return TutorToneProfile.RESISTANCE_LEADER;
        if (neuroticism < 0.2 && agreeableness < 0.2) return TutorToneProfile.AI_OVERLORD;

        return TutorToneProfile.GENTLE_GUIDE; // Default
    }

    /**
     * Mutates traits based on a delta (e.g., +0.1 Neuroticism on error).
     */
    public mutate(delta: Partial<BigFive>): void {
        Object.entries(delta).forEach(([key, value]) => {
            const traitKey = key as keyof BigFive;
            this.traits[traitKey] = Math.max(0, Math.min(1, this.traits[traitKey] + (value || 0)));
        });
    }
}
