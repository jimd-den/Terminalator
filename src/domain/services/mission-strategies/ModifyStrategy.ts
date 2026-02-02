import { IMissionStrategy } from './IMissionStrategy';
import { Mission, MissionStep } from '../../entities/Mission';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { TutorAction, TutorProgressionResult } from '../TutorService';
import { MissionRepository } from '../MissionRepository';
import { LessonRegistry } from '../LessonRegistry';
import { StrategyUtils } from './StrategyUtils';

export class ModifyStrategy implements IMissionStrategy {
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

        // Step 1: Connect -> Locate
        if (mission.currentStep === MissionStep.PENDING) {
            if (state.fsContext === mission.targetSystem) {
                const nextStepData = steps.find(s => s.type === 'MODIFY');

                // [NEW] Check Navigation
                const nav = StrategyUtils.handleNavigation(mission, state, nextStepData?.cwd);
                if (nav) return { hint: null, progression: nav };

                progression = {
                    type: 'START_LESSON',
                    lessonId: `MISSION_SCAN_${mission.id}`,
                    objectiveTarget: mission.objectiveTarget,
                    nextStep: MissionStep.CONNECTED,
                    text: missionRepository.injectVariables('ls -la', mission as any), // Suggest ls -la after ssh
                    instructions: missionRepository.injectVariables(nextStepData?.instructions || 'NAVIGATE TO TARGET.', mission as any),
                    isMission: true
                };
                hint = {
                    message: `Connection established. Target: ${mission.objectiveTarget}. Begin search.`,
                    type: 'HINT',
                    confidence: 1.0
                };
            } else {
                hint = {
                    message: `Connect to target system: 'ssh admin@${mission.targetSystem}'.`,
                    type: 'HINT',
                    confidence: 0.5
                };
            }
        }

        // Step 2: Locate
        else if (mission.currentStep === MissionStep.CONNECTED) {
            const step = steps.find(s => s.type === 'MODIFY');
            const isSearchCmd = lastResponse.command?.includes('ls') || lastResponse.command?.includes('find');
            if (isSearchCmd && lastResponse.output.includes(mission.objectiveTarget)) {
                progression = {
                    type: 'START_LESSON',
                    lessonId: `MISSION_EDIT_${mission.id}`,
                    objectiveTarget: mission.objectiveTarget,
                    nextStep: MissionStep.LOCATED,
                    text: missionRepository.injectVariables(step?.command || '', mission as any),
                    instructions: missionRepository.injectVariables(step?.instructions || '', mission as any),
                    isMission: true
                };
                hint = {
                    message: `Target found. Append signature to ${mission.objectiveTarget}.`,
                    type: 'HINT',
                    confidence: 1.0
                };
            } else {
                // [NEW] Check Navigation
                const nav = StrategyUtils.handleNavigation(mission, state, step?.cwd);
                if (nav) return { hint: null, progression: nav };

                hint = {
                    message: `Locate the target file '${mission.objectiveTarget}'.`,
                    type: 'HINT',
                    confidence: 0.7
                };
            }
        }

        // Step 3: Complete
        else if (mission.currentStep === MissionStep.LOCATED) {
            const step = steps.find(s => s.type === 'MODIFY');
            const isModifyCmd = lastResponse.command?.includes('echo') || lastResponse.command?.includes('>>');
            if (lastResponse.exitCode === 0 && isModifyCmd) {
                hint = {
                    message: `Modifications detected. Mission Accomplished.`,
                    type: 'CONGRATS',
                    confidence: 1.0
                };
            } else {
                // [NEW] Check Navigation
                const nav = StrategyUtils.handleNavigation(mission, state, step?.cwd);
                if (nav) return { hint: null, progression: nav };

                hint = {
                    message: `Append the signature 'HACKED' to '${mission.objectiveTarget}'.`,
                    type: 'HINT',
                    confidence: 0.8
                };
            }
        }

        return { hint, progression };
    }
}
