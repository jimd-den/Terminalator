/**
 * AdaptiveTutorEngine.ts
 *
 * Pillar: THE MASTER'S TOOL (Contextual Generation)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Service
 *
 * Intent:
 * Replaces static templates with a dynamic, knowledge-driven dialogue generator.
 * The Tutor constructs sentences by understanding the Command, the Mission, 
 * and the User's History.
 */

import { UnixKnowledgeBase } from '../knowledge/UnixKnowledgeBase';
import { TutorIntent } from '../../entities/tutor/TutorIntent';
import { TutorToneProfile } from '../../entities/tutor/TutorToneProfile';
import { TutorAction } from '../../interfaces/ITutorService';
import { Mission } from '../../entities/Mission';
import { SentenceConstructor } from './SentenceConstructor';

export class AdaptiveTutorEngine {
    private constructorLogic: SentenceConstructor;

    constructor(private kb: UnixKnowledgeBase) {
        this.constructorLogic = new SentenceConstructor();
    }

    public generateAdvice(
        intent: TutorIntent,
        tone: TutorToneProfile,
        mission: Mission,
        lastCommand?: string
    ): TutorAction {
        
        // 1. Mission Context
        const currentStep = mission.grammar?.steps.find(s => s.id === mission.currentStepId);
        
        // 2. Knowledge Base Lookup
        const requiredToolName = currentStep?.lessonText?.split(' ')[0];
        const toolDef = requiredToolName ? this.kb.getCommand(requiredToolName) : undefined;

        let message = '';

        if (intent === TutorIntent.NUDGE_PROGRESSION && currentStep) {
            // Generative Nudge using SentenceConstructor
            if (toolDef) {
                const capability = toolDef.capabilities[0].toLowerCase();
                const action = `utilizing '${toolDef.name}'`;
                const reason = `${capability} the data stream via '${toolDef.name}' to ${currentStep.description}`;
                
                message = this.constructorLogic.constructImperative(action, reason, tone);
            } else {
                message = this.constructorLogic.constructImperative("proceeding", currentStep.description, tone);
            }
        } else if (intent === TutorIntent.REPRIMAND_MISTAKE && lastCommand) {
            // Generative Critique
            message = this.constructorLogic.constructCritique(`The command '${lastCommand}' failed to advance the state`, tone);
        } else if (intent === TutorIntent.SYSTEM_BOOT) {
            // Generative Welcome
            message = this.constructorLogic.constructGreeting(tone);
        } else if (intent === TutorIntent.MISSION_BRIEFING) {
            // Generative Briefing
            const verb = mission.metadata?.logic?.verb || 'ACCESS';
            const noun = mission.metadata?.logic?.noun || 'DATA';
            message = this.constructorLogic.constructBriefing(verb, noun, mission.targetSystem, tone);
        } else if (intent === TutorIntent.IDLE_OBSERVATION) {
            // Generative Idle Chatter
            message = this.constructorLogic.constructIdle(tone);
        } else if (intent === TutorIntent.RHYTHM_REPORT) {
            message = this.constructorLogic.constructRhythmFeedback(tone, 'FAST'); // Default to fast for now or pass arg
        } else if (intent === TutorIntent.ACCURACY_CRITIQUE) {
            message = this.constructorLogic.constructAccuracyFeedback(tone);
        } else if (intent === TutorIntent.INPUT_PROGRESS) {
            message = this.constructorLogic.constructInputProgress(tone);
        } else {
            // Fallback
            message = this.styleMessage(tone, "Proceed with caution.");
        }

        return {
            missionId: mission.id,
            type: 'HINT',
            message,
            confidence: 1.0,
            severity: 'INFO'
        };
    }

    private styleMessage(tone: TutorToneProfile, baseText: string): string {
        const structures = {
            [TutorToneProfile.SNARKY_SYSADMIN]: [
                () => `Look, just... ${baseText} It's not rocket science.`,
                () => `Listen up: ${baseText} Try to keep up.`,
                () => `Obviously, ${baseText} Unless you have a better idea?`
            ],
            [TutorToneProfile.GENTLE_GUIDE]: [
                () => `Try this: ${baseText} You've got this!`,
                () => `Maybe you could try: ${baseText} I believe in you.`,
                () => `How about we: ${baseText} Take your time.`
            ],
            [TutorToneProfile.AI_OVERLORD]: [
                () => `CALCULATION: ${baseText.toUpperCase()}`,
                () => `DIRECTIVE: COMPLIANCE WITH ${baseText.toUpperCase()} IS MANDATORY.`,
                () => `ANALYSIS: ${baseText.toUpperCase()} IS THE OPTIMAL PATH.`
            ],
            [TutorToneProfile.CORPORATE_DRONE]: [
                () => `Status Update: ${baseText}`,
                () => `Authorized Procedure: ${baseText}`,
                () => `As per protocol: ${baseText}`
            ],
            [TutorToneProfile.RESISTANCE_LEADER]: [
                () => `For the Grid! ${baseText}`,
                () => `Take them down: ${baseText}`,
                () => `Strike now: ${baseText}`
            ]
        };

        const choices = structures[tone] || [() => baseText];
        return choices[Math.floor(Math.random() * choices.length)]();
    }
}
