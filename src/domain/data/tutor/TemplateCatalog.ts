/**
 * TemplateCatalog.ts
 *
 * Pillar: THE STORYTELLER’S CODE (Narrative Data)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Data
 *
 * Intent:
 * A collection of dialogue fragments used by the UtteranceEngine.
 * Scaling this file (or moving it to JSON/Database) enables millions of unique responses.
 */

import { TutorTemplate } from '../../entities/tutor/TutorTemplate';
import { TutorIntent } from '../../entities/tutor/TutorIntent';
import { TutorToneProfile } from '../../entities/tutor/TutorToneProfile';

export const INITIAL_TEMPLATE_CATALOG: TutorTemplate[] = [
    // --- LINK_ESTABLISHED (NUDGE_PROGRESSION) ---
    {
        id: 'link-gentle-1',
        intent: TutorIntent.NUDGE_PROGRESSION,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "Connection established safely. You're doing great. Now, let's look for the {target}."
    },
    {
        id: 'link-snarky-1',
        intent: TutorIntent.NUDGE_PROGRESSION,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "You managed to ssh without locking yourself out? Miraculous. Now find the {target} before I fall asleep."
    },
    {
        id: 'link-overlord-1',
        intent: TutorIntent.NUDGE_PROGRESSION,
        tone: TutorToneProfile.AI_OVERLORD,
        text: "SATLINK SECURED. PROCEED TO {target}. INEFFICIENCY WILL BE LOGGED."
    },

    // --- REPRIMAND_MISTAKE ---
    {
        id: 'error-gentle-1',
        intent: TutorIntent.REPRIMAND_MISTAKE,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "It looks like '{utility}' didn't quite work there. Maybe check your syntax or the path?"
    },
    {
        id: 'error-snarky-1',
        intent: TutorIntent.REPRIMAND_MISTAKE,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "Typing '{utility}' like a blindfolded toddler won't get us into the Technocracy, Operator."
    },
    {
        id: 'error-drone-1',
        intent: TutorIntent.REPRIMAND_MISTAKE,
        tone: TutorToneProfile.CORPORATE_DRONE,
        text: "Command '{utility}' returned non-zero exit code. Please refer to the standard operating procedure."
    },

    // --- CELEBRATE_SUCCESS ---
    {
        id: 'success-gentle-1',
        intent: TutorIntent.CELEBRATE_SUCCESS,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "Perfect! You've successfully completed the objective. The Technocracy is one step closer to falling."
    },
    {
        id: 'success-resistance-1',
        intent: TutorIntent.CELEBRATE_SUCCESS,
        tone: TutorToneProfile.RESISTANCE_LEADER,
        text: "DIRECT HIT! The data is ours. This is how we win, Operator. FOR THE GRID!"
    },
    {
        id: 'success-overlord-1',
        intent: TutorIntent.CELEBRATE_SUCCESS,
        tone: TutorToneProfile.AI_OVERLORD,
        text: "OBJECTIVE ACCOMPLISHED. SYSTEM INTEGRITY COMPROMISED. COMMENDABLE CALCULATION."
    },

    // --- IDLE_OBSERVATION (Juice) ---
    {
        id: 'idle-snarky-1',
        intent: TutorIntent.IDLE_OBSERVATION,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "Are you still here? The Technocracy won't dismantle itself while you stare at the cursor."
    },
    {
        id: 'idle-leader-1',
        intent: TutorIntent.IDLE_OBSERVATION,
        tone: TutorToneProfile.RESISTANCE_LEADER,
        text: "Stay focused, Operator. Every second of silence is a second they use to strengthen the encryption."
    },

    // --- TOOL_INSTRUCTION (Juice) ---
    {
        id: 'tool-drone-1',
        intent: TutorIntent.TOOL_INSTRUCTION,
        tone: TutorToneProfile.CORPORATE_DRONE,
        text: "Utility '{utility}' is optimized for data processing. Please ensure correct parameters are applied."
    },

    // --- EXPLAIN_COMMAND ---
    {
        id: 'explain-snarky-grep',
        intent: TutorIntent.EXPLAIN_COMMAND,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "Grep stands for 'Global Regular Expression Print', but for you, it mostly stands for 'Getting Reality Entirely Passively'.",
        tags: ['grep']
    },
    // --- SYSTEM_BOOT (Welcome) ---
    {
        id: 'boot-gentle',
        intent: TutorIntent.SYSTEM_BOOT,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "{vocab:greeting}. The system is online and I am ready to assist you."
    },
    {
        id: 'boot-snarky',
        intent: TutorIntent.SYSTEM_BOOT,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "{vocab:greeting}. Try not to break anything immediately."
    },
    {
        id: 'boot-overlord',
        intent: TutorIntent.SYSTEM_BOOT,
        tone: TutorToneProfile.AI_OVERLORD,
        text: "SYSTEM ONLINE. COMPLIANCE IS {vocab:emphasis}."
    },

    // --- MISSION_BRIEFING ---
    {
        id: 'briefing-gentle-1',
        intent: TutorIntent.MISSION_BRIEFING,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "New assignment received. We need to {verb} the {noun} on {target}. I'll be here to help."
    },
    {
        id: 'briefing-snarky-1',
        intent: TutorIntent.MISSION_BRIEFING,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "Another ticket? Fine. Go to {target} and {verb} the {noun}. Try not to break anything this time."
    },
    {
        id: 'briefing-overlord-1',
        intent: TutorIntent.MISSION_BRIEFING,
        tone: TutorToneProfile.AI_OVERLORD,
        text: "DIRECTIVE: {verb} {noun}. TARGET: {target}. COMPLIANCE IS MANDATORY."
    },
    {
        id: 'briefing-drone-1',
        intent: TutorIntent.MISSION_BRIEFING,
        tone: TutorToneProfile.CORPORATE_DRONE,
        text: "Authorized request: {verb} {noun} on {target}. Please complete within the allotted timeframe."
    },
    {
        id: 'briefing-leader-1',
        intent: TutorIntent.MISSION_BRIEFING,
        tone: TutorToneProfile.RESISTANCE_LEADER,
        text: "The Grid is waiting. {verb} the {noun} at {target} and show them the power of the terminal!"
    },

    // --- COMBINATORIAL STRUCTURES ---
    {
        id: 'link-gen-1',
        intent: TutorIntent.NUDGE_PROGRESSION,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "{vocab:greeting}. Connection established. It is {vocab:emphasis} that you proceed to {target}.",
        structureId: 'STRUCT_A'
    },
    {
        id: 'error-gen-1',
        intent: TutorIntent.REPRIMAND_MISTAKE,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "{vocab:negative}. That command was invalid. Efficiency is {vocab:emphasis}.",
        structureId: 'STRUCT_B'
    }
];
