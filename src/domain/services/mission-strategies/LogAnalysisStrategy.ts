import { IMissionStrategy } from './IMissionStrategy';
import { Mission, MissionStep } from '../../entities/Mission';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { TutorAction, TutorProgressionResult } from '../TutorService';
import { MissionRepository } from '../MissionRepository';
import { LessonRegistry } from '../LessonRegistry';

/**
 * LogAnalysisStrategy - Domain Layer
 * 
 * Archetype: "The Needle"
 * 
 * Narrative: Splunk is down. CloudWatch is lagging. The player must use
 * raw terminal power to find a specific request ID in a massive log file.
 */
export class LogAnalysisStrategy implements IMissionStrategy {
    evaluate(
        mission: Mission,
        state: TerminalState,
        lastResponse: CommandResponse,
        missionRepository: MissionRepository,
        lessonRegistry: LessonRegistry
    ): { hint: TutorAction | null; progression: TutorProgressionResult | null } {
        let hint: TutorAction | null = null;
        let progression: TutorProgressionResult | null = null;

        const steps = missionRepository.getStepsForArchetype(mission.type);

        // Step 1: Connect -> Identify
        if (mission.currentStep === MissionStep.PENDING) {
            if (state.fsContext === mission.targetSystem) {
                const step = steps.find(s => s.type === 'IDENTIFY');
                progression = {
                    type: 'START_LESSON',
                    lessonId: `LOG_SCAN_${mission.id}`,
                    nextStep: MissionStep.CONNECTED,
                    text: missionRepository.injectVariables(step?.command || '', { targetSystem: mission.targetSystem, objectiveTarget: mission.objectiveTarget }),
                    instructions: missionRepository.injectVariables(step?.instructions || '', { targetSystem: mission.targetSystem, objectiveTarget: mission.objectiveTarget }),
                    isMission: true
                };
                hint = {
                    message: lessonRegistry.getDialogue('efficiency.grep_hint') || "Connection secured. Now locate the fault ID.",
                    type: 'HINT',
                    confidence: 1.0
                };
            } else {
                hint = {
                    message: `Establish link: 'ssh admin@${mission.targetSystem}'.`,
                    type: 'HINT',
                    confidence: 0.5
                };
            }
        }

        // Step 2: Identify the Needle
        else if (mission.currentStep === MissionStep.CONNECTED) {
            const step = steps.find(s => s.type === 'IDENTIFY');
            if (lastResponse.output.includes(mission.objectiveTarget)) {
                progression = {
                    type: 'START_LESSON',
                    lessonId: `LOG_REPAIR_${mission.id}`,
                    nextStep: MissionStep.LOCATED,
                    text: `vim /etc/httpd/conf.d/proxy.conf`,
                    instructions: `ID RECOVERY SUCCESSFUL. FAULT IDENTIFIED: ${mission.objectiveTarget}. FIX THE PROXY CONFIG.`
                };
                hint = {
                    message: `Fault isolated. Request ID ${mission.objectiveTarget} found. Open the config to fix the route.`,
                    type: 'HINT',
                    confidence: 1.0
                };
            } else {
                hint = {
                    message: missionRepository.injectVariables(step?.instructions || '', { targetSystem: mission.targetSystem }),
                    type: 'HINT',
                    confidence: 0.8
                };
            }
        }

        // Step 3: Complete
        else if (mission.currentStep === MissionStep.LOCATED) {
            if (lastResponse.command?.includes('vim') && lastResponse.exitCode === 0) {
                hint = {
                    message: `Infrastructure stabilized. Mission Accomplished.`,
                    type: 'CONGRATS',
                    confidence: 1.0
                };
            } else {
                hint = {
                    message: `Perform the repair using 'vim'. The infrastructure is counting on you.`,
                    type: 'HINT',
                    confidence: 0.8
                };
            }
        }

        return { hint, progression };
    }
}
