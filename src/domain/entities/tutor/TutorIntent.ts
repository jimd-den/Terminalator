/**
 * TutorIntent.ts
 *
 * Pillar: THE STORYTELLER’S CODE (Semantic Intent)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Entities
 *
 * Intent:
 * Defines the semantic "moves" the Tutor AI can make. 
 * Decouples the "What" (semantic meaning) from the "How" (specific words/tone).
 */

export enum TutorIntent {
    /**
     * Explains the technical meaning or consequence of a command.
     */
    EXPLAIN_COMMAND = 'EXPLAIN_COMMAND',

    /**
     * Provides a gentle push toward the next logical step in a mission.
     */
    NUDGE_PROGRESSION = 'NUDGE_PROGRESSION',

    /**
     * Reacts to a user error or inefficient command with varying degrees of heat.
     */
    REPRIMAND_MISTAKE = 'REPRIMAND_MISTAKE',

    /**
     * Celebrates a successful step completion or clever hack.
     */
    CELEBRATE_SUCCESS = 'CELEBRATE_SUCCESS',

    /**
     * Provides world-building lore or propaganda about the Technocracy.
     */
    DROP_LORE = 'DROP_LORE',

    /**
     * Instructs the user on how to use a specific utility (e.g., awk, sed).
     */
    TOOL_INSTRUCTION = 'TOOL_INSTRUCTION',

    /**
     * Briefs the user on the mission objective and target.
     */
    MISSION_BRIEFING = 'MISSION_BRIEFING',

    /**
     * Initial welcome message on system boot.
     */
    SYSTEM_BOOT = 'SYSTEM_BOOT',

    /**
     * Reacts to user typing progress or rhythm.
     */
    INPUT_PROGRESS = 'INPUT_PROGRESS',
    RHYTHM_REPORT = 'RHYTHM_REPORT',
    ACCURACY_CRITIQUE = 'ACCURACY_CRITIQUE',

    /**
     * Idle chatter or philosophical observations about terminal supremacy.
     */
    IDLE_OBSERVATION = 'IDLE_OBSERVATION',

    // --- Generative Mission Instruction Intents ---
    INSTRUCT_SSH = 'INSTRUCT_SSH',
    INSTRUCT_CD = 'INSTRUCT_CD',
    INSTRUCT_ACTION = 'INSTRUCT_ACTION',
    LINK_ESTABLISHED = 'LINK_ESTABLISHED',
    FILE_LOCATED = 'FILE_LOCATED',
    MISSION_ACCOMPLISHED = 'MISSION_ACCOMPLISHED',

    // --- System / Diegetic Intents ---
    SYSTEM_CONNECTING = 'SYSTEM_CONNECTING',
    SYSTEM_REWARD_ESCROW = 'SYSTEM_REWARD_ESCROW',
    PERSONA_INITIALIZED = 'PERSONA_INITIALIZED'
}
