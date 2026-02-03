import { Mission, MissionStep } from '../../../entities/Mission';
import { TerminalState } from '../../../entities/TerminalState';
import { CommandResponse } from '../../../entities/Command';
import { TutorProgressionResult } from '../../../interfaces/ITutorService';
import { MissionRepository } from '../../MissionRepository';
import { MissionProgressor } from '../ComposableTypes';
import { StrategyUtils } from '../StrategyUtils';

export const ExfiltrateProgression: MissionProgressor = (
    mission,
    state,
    lastResponse,
    isStepComplete,
    missionRepository
) => {
    const steps = missionRepository.getStepsForArchetype(mission.type);

    switch (mission.currentStep) {
        case MissionStep.PENDING:
            if (isStepComplete) {
                const nextStepData = steps.find(s => s.type === 'LOCATE');
                
                const nav = StrategyUtils.handleNavigation(mission, state, nextStepData?.cwd);
                if (nav) return nav;

                return {
                    type: 'START_LESSON',
                    lessonId: `MISSION_SCAN_${mission.id}`,
                    objectiveTarget: mission.objectiveTarget,
                    nextStep: MissionStep.CONNECTED,
                    text: missionRepository.injectVariables(nextStepData?.command || 'ls -la', mission as any),
                    instructions: missionRepository.injectVariables(nextStepData?.instructions || '', mission as any),
                    isMission: true
                };
            }
            break;

        case MissionStep.CONNECTED:
            const step = steps.find(s => s.type === 'LOCATE');
            if (isStepComplete) {
                const nextStepData = steps.find(s => s.type === 'RECOVER');
                return {
                    type: 'START_LESSON',
                    lessonId: `MISSION_SCP_${mission.id}`,
                    objectiveTarget: mission.objectiveTarget,
                    nextStep: MissionStep.LOCATED,
                    text: missionRepository.injectVariables(nextStepData?.command || '', mission as any),
                    instructions: missionRepository.injectVariables(nextStepData?.instructions || '', mission as any),
                    isMission: true
                };
            } else {
                const nav = StrategyUtils.handleNavigation(mission, state, step?.cwd);
                if (nav) return nav;
            }
            break;

        case MissionStep.LOCATED:
            const recoverStep = steps.find(s => s.type === 'RECOVER');
            if (!isStepComplete) {
                const nav = StrategyUtils.handleNavigation(mission, state, recoverStep?.cwd);
                if (nav) return nav;
            }
            break;
    }

    return null;
};
