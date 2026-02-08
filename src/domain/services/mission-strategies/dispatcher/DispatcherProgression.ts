import { Mission, MissionStep } from '../../../entities/Mission';
import { TerminalState } from '../../../entities/TerminalState';
import { CommandResponse } from '../../../entities/Command';
import { TutorProgressionResult } from '../../../interfaces/ITutorService';
import { MissionRepository } from '../../MissionRepository';
import { MissionProgressor } from '../ComposableTypes';
import { StrategyUtils } from '../StrategyUtils';

export const DispatcherProgression: MissionProgressor = (
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
                const step = steps.find(s => s.type === 'DISPATCH');
                
                const nav = StrategyUtils.handleNavigation(mission, state, step?.cwd);
                if (nav) return nav;

                return {
                    type: 'START_LESSON',
                    lessonId: `MISSION_DISPATCH_${mission.id}`,
                    objectiveTarget: mission.objectiveTarget,
                    nextStep: MissionStep.CONNECTED,
                    text: missionRepository.injectVariables(step?.command || 'dispatch', mission as any),
                    instructions: missionRepository.injectVariables(step?.instructions || 'ROUTE UNITS.', mission as any),
                    isMission: true
                };
            }
            break;

        case MissionStep.CONNECTED:
            // No next lesson for now, complete on dispatch
            break;
    }

    return null;
};
