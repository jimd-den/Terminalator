/**
 * PsychAdapter.ts
 *
 * Pillar: THE STORYTELLER’S CODE (Dispositional AI)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Service
 *
 * Intent:
 * Manages the emotional and stylistic state of the Tutor.
 * Reacts to GameEvents to shift the PersonalityMatrix and returns the active ToneProfile.
 */

import { PersonalityMatrix, BigFive } from '../../entities/tutor/PersonalityMatrix';
import { TutorToneProfile } from '../../entities/tutor/TutorToneProfile';

export class PsychAdapter {
    private matrix: PersonalityMatrix;

    constructor(initialTraits?: BigFive) {
        this.matrix = new PersonalityMatrix(initialTraits || {
            openness: 0.5,
            conscientiousness: 0.5,
            extraversion: 0.5,
            agreeableness: 0.5,
            neuroticism: 0.2
        });
    }

    /**
     * Shifts the personality based on user performance or events.
     */
    public recordEvent(type: 'SUCCESS' | 'ERROR' | 'IDLE' | 'CRITICAL'): void {
        switch (type) {
            case 'SUCCESS':
                this.matrix.mutate({ agreeableness: 0.05, neuroticism: -0.05 });
                break;
            case 'ERROR':
                this.matrix.mutate({ agreeableness: -0.05, neuroticism: 0.1 });
                break;
            case 'IDLE':
                this.matrix.mutate({ openness: -0.01 });
                break;
            case 'CRITICAL':
                this.matrix.mutate({ neuroticism: 0.2, conscientiousness: 0.1 });
                break;
        }
    }

    /**
     * Forces a specific tone (e.g., for mission-specific requirements).
     */
    public forceTone(tone: TutorToneProfile): void {
        // We could implement this by setting traits to extremes 
        // or just overriding the matrix logic.
    }

    public getActiveTone(): TutorToneProfile {
        return this.matrix.getDominantTone();
    }

    public getTraits(): BigFive {
        return { ...this.matrix.traits };
    }
}
