/**
 * TutorTemplate.ts
 *
 * Pillar: THE STORYTELLER’S CODE (Utterance Grammar)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Entities
 *
 * Intent:
 * Defines the structure for a generative dialogue fragment.
 * These templates are filtered and selected by the UtteranceEngine.
 */

import { TutorIntent } from './TutorIntent';
import { TutorToneProfile } from './TutorToneProfile';

export interface TutorTemplate {
    /**
     * Unique identifier for the template.
     */
    readonly id: string;

    /**
     * The semantic move this template makes.
     */
    readonly intent: TutorIntent;

    /**
     * The stylistic lens this template fits.
     */
    readonly tone: TutorToneProfile;

    /**
     * The raw text with placeholders (e.g., "You used {utility} on {target}.").
     */
    readonly text: string;

    /**
     * Optional weight for RNG selection (default: 1.0).
     */
    readonly weight?: number;

    /**
     * Optional tags for secondary filtering (e.g., 'unix', 'riscv', 'early-game').
     */
    readonly tags?: string[];

    /**
     * ID for combinatorial structure grouping (e.g., 'GREETING_STRUCTURE_A').
     */
    readonly structureId?: string;
}

/**
 * Context provided to the Utterance Engine for string interpolation.
 */
export interface UtteranceContext {
    utility?: string;
    target?: string;
    error?: string;
    missionName?: string;
    technocracyName?: string;
    [key: string]: string | number | undefined;
}
