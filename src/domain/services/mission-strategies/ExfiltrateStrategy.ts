import { IMissionStrategy } from './IMissionStrategy';
import { Mission, MissionStep } from '../../entities/Mission';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { TutorAction, TutorProgressionResult } from '../TutorService';
import { MissionRepository } from '../MissionRepository';
import { LessonRegistry } from '../LessonRegistry';
import { StrategyUtils } from './StrategyUtils';

export class ExfiltrateStrategy implements IMissionStrategy {
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
                const nextStepData = steps.find(s => s.type === 'LOCATE');

                // [NEW] Check Navigation
                const nav = StrategyUtils.handleNavigation(mission, state, nextStepData?.cwd);
                if (nav) return { hint: null, progression: nav };

                progression = {
                    type: 'START_LESSON',
                    lessonId: `MISSION_SCAN_${mission.id}`,
                    objectiveTarget: mission.objectiveTarget,
                    nextStep: MissionStep.CONNECTED,
                    text: missionRepository.injectVariables(nextStepData?.command || 'ls -la', mission as any),
                    instructions: missionRepository.injectVariables(nextStepData?.instructions || '', mission as any),
                    isMission: true
                };

                hint = {
                    message: `Connection established. Begin scanning for payload: ${mission.objectiveTarget}`,
                    type: 'HINT',
                    confidence: 1.0
                };
            } else {
                hint = {
                    message: `Initiate connection: 'ssh admin@${mission.targetSystem}'.`,
                    type: 'HINT',
                    confidence: 0.5
                };
            }
        }

        // Step 2: Locate
        else if (mission.currentStep === MissionStep.CONNECTED) {
            const step = steps.find(s => s.type === 'LOCATE');
            const isSearchCmd = lastResponse.command?.includes('ls') || lastResponse.command?.includes('find');
            if (isSearchCmd && lastResponse.output.includes(mission.objectiveTarget)) {
                const nextStepData = steps.find(s => s.type === 'RECOVER');
                progression = {
                    type: 'START_LESSON',
                    lessonId: `MISSION_SCP_${mission.id}`,
                    objectiveTarget: mission.objectiveTarget,
                    nextStep: MissionStep.LOCATED,
                    text: missionRepository.injectVariables(nextStepData?.command || '', mission as any),
                    instructions: missionRepository.injectVariables(nextStepData?.instructions || '', mission as any),
                    isMission: true
                };
                hint = {
                    message: `Target located. Retrieve it using scp.`,
                    type: 'HINT',
                    confidence: 1.0
                };
            } else {
                // [NEW] Check Navigation
                const nav = StrategyUtils.handleNavigation(mission, state, step?.cwd);
                if (nav) return { hint: null, progression: nav };

                hint = {
                    message: missionRepository.injectVariables(step?.instructions || '', mission as any),
                    type: 'HINT',
                    confidence: 0.7
                };
            }
        }

        // Step 3: Complete
        else if (mission.currentStep === MissionStep.LOCATED) {
            const step = steps.find(s => s.type === 'RECOVER');
            if (lastResponse.command?.includes('scp') && lastResponse.exitCode === 0) {
                hint = {
                    message: `Payload secured. Mission Accomplished.`,
                    type: 'CONGRATS',
                    confidence: 1.0
                };
            } else {
                // [NEW] Check Navigation
                const nav = StrategyUtils.handleNavigation(mission, state, step?.cwd);
                if (nav) return { hint: null, progression: nav };

                hint = {
                    message: `Extract the payload to your local machine using 'scp'.`,
                    type: 'HINT',
                    confidence: 0.8
                };
            }
        }

        return { hint, progression };
    }
}
