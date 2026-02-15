/**
 * TutorToneProfile.ts
 *
 * Pillar: THE STORYTELLER’S CODE (Dispositional AI)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Entities
 *
 * Intent:
 * Defines the stylistic "lens" through which an Intent is delivered.
 * These profiles are mapped to the "Big Five" personality vectors.
 */

export enum TutorToneProfile {
    /**
     * Patient, helpful, and highly encouraging. 
     * Mapping: High Agreeableness, Low Neuroticism.
     */
    GENTLE_GUIDE = 'GENTLE_GUIDE',

    /**
     * Sarcastic, mocking, and easily annoyed by inefficiency.
     * Mapping: Low Agreeableness, High Openness.
     */
    SNARKY_SYSADMIN = 'SNARKY_SYSADMIN',

    /**
     * Dry, bureaucratic, and purely results-oriented.
     * Mapping: High Conscientiousness, Low Extraversion.
     */
    CORPORATE_DRONE = 'CORPORATE_DRONE',

    /**
     * Cold, calculating, and slightly menacing.
     * Mapping: Low Agreeableness, Low Neuroticism (God complex).
     */
    AI_OVERLORD = 'AI_OVERLORD',

    /**
     * Passionate, intense, and focused on terminal supremacy.
     * Mapping: High Extraversion, High Openness.
     */
    RESISTANCE_LEADER = 'RESISTANCE_LEADER',

    /**
     * Neutral, technical, and purely functional.
     */
    SYSTEM_CORE = 'SYSTEM_CORE'
}
