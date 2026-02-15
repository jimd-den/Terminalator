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
        id: 'error-overlord-1',
        intent: TutorIntent.REPRIMAND_MISTAKE,
        tone: TutorToneProfile.AI_OVERLORD,
        text: "EXECUTION FAILURE: {utility}. {vocab:emphasis} ERROR DETECTED. RECALIBRATE."
    },
    {
        id: 'error-drone-2',
        intent: TutorIntent.REPRIMAND_MISTAKE,
        tone: TutorToneProfile.CORPORATE_DRONE,
        text: "Efficiency metric drop detected. '{utility}' is not compliant with {vocab:noun} {vocab:adjective}."
    },
    {
        id: 'error-snarky-3',
        intent: TutorIntent.REPRIMAND_MISTAKE,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "I've seen shell scripts with more {vocab:noun} than your attempt at '{utility}'."
    },
    {
        id: 'error-gentle-3',
        intent: TutorIntent.REPRIMAND_MISTAKE,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "Almost! '{utility}' was close, but maybe try a different {vocab:noun}?"
    },

    // --- CELEBRATE_SUCCESS ---
    {
        id: 'success-gentle-1',
        intent: TutorIntent.CELEBRATE_SUCCESS,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "Perfect! You've successfully completed the objective. The Technocracy is one step closer to falling."
    },
    {
        id: 'success-gentle-2',
        intent: TutorIntent.CELEBRATE_SUCCESS,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "Well done! That was a {vocab:adjective} {vocab:noun}."
    },
    {
        id: 'success-gentle-3',
        intent: TutorIntent.CELEBRATE_SUCCESS,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "{vocab:greeting}, you solved it! Your {vocab:noun} is improving {vocab:adverb}."
    },
    {
        id: 'success-snarky-1',
        intent: TutorIntent.CELEBRATE_SUCCESS,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "You didn't break the kernel. I'm {vocab:adjective}. Proceed to the next {vocab:noun}."
    },
    {
        id: 'success-snarky-2',
        intent: TutorIntent.CELEBRATE_SUCCESS,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "Even a broken clock is right twice a day. Your {vocab:noun} was {vocab:adjective}."
    },
    {
        id: 'success-overlord-2',
        intent: TutorIntent.CELEBRATE_SUCCESS,
        tone: TutorToneProfile.AI_OVERLORD,
        text: "COMPLIANCE ACHIEVED. {vocab:noun} {vocab:adverb} INTEGRATED. {vocab:emphasis} SUCCESS."
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

    // --- INSTRUCT_SSH ---
    {
        id: 'instr-ssh-gentle',
        intent: TutorIntent.INSTRUCT_SSH,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "To begin, please {vocab:verb} to the remote host: {lessonText}."
    },
    {
        id: 'instr-ssh-gentle-2',
        intent: TutorIntent.INSTRUCT_SSH,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "Let's start by {vocab:verb}ing into {target}. Type {lessonText} when you're ready."
    },
    {
        id: 'instr-ssh-snarky',
        intent: TutorIntent.INSTRUCT_SSH,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "Don't just sit there. {vocab:verb} into {target} using {lessonText}."
    },
    {
        id: 'instr-ssh-snarky-2',
        intent: TutorIntent.INSTRUCT_SSH,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "I hope you remember the password for {target}. Run {lessonText}."
    },
    {
        id: 'instr-ssh-overlord',
        intent: TutorIntent.INSTRUCT_SSH,
        tone: TutorToneProfile.AI_OVERLORD,
        text: "ESTABLISH SATLINK. COMMAND: {lessonText}. {vocab:emphasis}."
    },
    {
        id: 'instr-ssh-drone',
        intent: TutorIntent.INSTRUCT_SSH,
        tone: TutorToneProfile.CORPORATE_DRONE,
        text: "Initiating remote session to {target}. Please input: {lessonText}."
    },

    // --- INSTRUCT_CD ---
    {
        id: 'instr-cd-gentle',
        intent: TutorIntent.INSTRUCT_CD,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "Next, we should move to the correct directory. Try typing {lessonText}."
    },
    {
        id: 'instr-cd-gentle-2',
        intent: TutorIntent.INSTRUCT_CD,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "Let's {vocab:verb} into the data directory. Run {lessonText}."
    },
    {
        id: 'instr-cd-snarky',
        intent: TutorIntent.INSTRUCT_CD,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "Navigation 101: {lessonText}. Do it now."
    },
    {
        id: 'instr-cd-overlord',
        intent: TutorIntent.INSTRUCT_CD,
        tone: TutorToneProfile.AI_OVERLORD,
        text: "NAVIGATE TO TARGET DIRECTORY. COMMAND: {lessonText}."
    },

    // --- INSTRUCT_ACTION ---
    {
        id: 'instr-act-gentle',
        intent: TutorIntent.INSTRUCT_ACTION,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "Now for the main task. Please {vocab:verb} with {lessonText}."
    },
    {
        id: 'instr-act-gentle-2',
        intent: TutorIntent.INSTRUCT_ACTION,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "You're doing great. One last step: {lessonText}."
    },
    {
        id: 'instr-act-leader',
        intent: TutorIntent.INSTRUCT_ACTION,
        tone: TutorToneProfile.RESISTANCE_LEADER,
        text: "Time to strike! {vocab:verb} the data: {lessonText}."
    },
    {
        id: 'instr-act-snarky',
        intent: TutorIntent.INSTRUCT_ACTION,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "Finish the job. Run {lessonText} and let's get out of here."
    },
    {
        id: 'instr-act-drone',
        intent: TutorIntent.INSTRUCT_ACTION,
        tone: TutorToneProfile.CORPORATE_DRONE,
        text: "Execute authorized {vocab:noun}: {lessonText}."
    },

    // --- LINK_ESTABLISHED ---
    {
        id: 'link-established-gentle',
        intent: TutorIntent.LINK_ESTABLISHED,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "Excellent. The link to {target} is stable."
    },

    // --- FILE_LOCATED ---
    {
        id: 'file-located-snarky',
        intent: TutorIntent.FILE_LOCATED,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "You found the directory. About time."
    },

    // --- MISSION_ACCOMPLISHED ---
    {
        id: 'mission-acc-overlord',
        intent: TutorIntent.MISSION_ACCOMPLISHED,
        tone: TutorToneProfile.AI_OVERLORD,
        text: "MISSION SUCCESSFUL. RESOURCE ESCROW RELEASED."
    },

    // --- RHYTHM_REPORT ---
    {
        id: 'rhythm-snarky-fast',
        intent: TutorIntent.RHYTHM_REPORT,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "Slow down, Speed Racer. Your {vocab:noun} is becoming {vocab:adjective}."
    },
    {
        id: 'rhythm-gentle-slow',
        intent: TutorIntent.RHYTHM_REPORT,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "Take a deep breath. A steady {vocab:noun} is better than a {vocab:adjective} one."
    },

    // --- ACCURACY_CRITIQUE ---
    {
        id: 'accuracy-overlord-1',
        intent: TutorIntent.ACCURACY_CRITIQUE,
        tone: TutorToneProfile.AI_OVERLORD,
        text: "ACCURACY BELOW THRESHOLD. YOUR {vocab:noun} IS {vocab:adjective}."
    },
    {
        id: 'accuracy-drone-1',
        intent: TutorIntent.ACCURACY_CRITIQUE,
        tone: TutorToneProfile.CORPORATE_DRONE,
        text: "Quality control warning: {vocab:verb} your input more {vocab:adverb}."
    },

    // --- INPUT_PROGRESS ---
    {
        id: 'progress-leader-1',
        intent: TutorIntent.INPUT_PROGRESS,
        tone: TutorToneProfile.RESISTANCE_LEADER,
        text: "Keep pushing! The {vocab:noun} is almost {vocab:adjective}!"
    },
    {
        id: 'progress-snarky-1',
        intent: TutorIntent.INPUT_PROGRESS,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "You're actually {vocab:verb}ing this? I'm {vocab:adjective}."
    },

    // --- SYSTEM_CONNECTING ---
    {
        id: 'sys-conn-1',
        intent: TutorIntent.SYSTEM_CONNECTING,
        tone: TutorToneProfile.SYSTEM_CORE,
        text: "CONNECTING TO SECURE CHANNEL {missionId}..."
    },
    {
        id: 'sys-conn-2',
        intent: TutorIntent.SYSTEM_CONNECTING,
        tone: TutorToneProfile.SYSTEM_CORE,
        text: "INITIALIZING SATLINK: {target}..."
    },

    // --- SYSTEM_REWARD_ESCROW ---
    {
        id: 'sys-esc-1',
        intent: TutorIntent.SYSTEM_REWARD_ESCROW,
        tone: TutorToneProfile.SYSTEM_CORE,
        text: "REWARD ESCROW: {reward}"
    },
    {
        id: 'sys-esc-2',
        intent: TutorIntent.SYSTEM_REWARD_ESCROW,
        tone: TutorToneProfile.SYSTEM_CORE,
        text: "CREDIT HOLD AUTHORIZED: {reward}"
    },

    // --- PERSONA_INITIALIZED ---
    {
        id: 'pers-init-overlord',
        intent: TutorIntent.PERSONA_INITIALIZED,
        tone: TutorToneProfile.AI_OVERLORD,
        text: "PERSONAL PROTOCOL {personaName} INITIALIZED. COMPLIANCE ESTIMATED AT 99.9%."
    },
    {
        id: 'pers-init-snarky',
        intent: TutorIntent.PERSONA_INITIALIZED,
        tone: TutorToneProfile.SNARKY_SYSADMIN,
        text: "Protocol {personaName} is online. Don't make me regret this."
    },
    {
        id: 'pers-init-gentle',
        intent: TutorIntent.PERSONA_INITIALIZED,
        tone: TutorToneProfile.GENTLE_GUIDE,
        text: "{vocab:greeting}, I am {personaName}. I'm here to help you navigate the system."
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
