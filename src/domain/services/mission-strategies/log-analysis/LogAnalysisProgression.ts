import { Mission, MissionStep } from '../../../entities/Mission';
import { TerminalState } from '../../../entities/TerminalState';
import { CommandResponse } from '../../../entities/Command';
import { TutorProgressionResult } from '../../../interfaces/ITutorService';
import { MissionRepository } from '../../MissionRepository';
import { MissionProgressor } from '../ComposableTypes';
import { StrategyUtils } from '../StrategyUtils';

export const LogAnalysisProgression: MissionProgressor = (
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
                const step = steps.find(s => s.type === 'IDENTIFY');
                const nav = StrategyUtils.handleNavigation(mission, state, step?.cwd);
                if (nav) return nav;

                return {
                    type: 'START_LESSON',
                    lessonId: `LOG_SCAN_${mission.id}`,
                    nextStep: MissionStep.CONNECTED,
                    text: missionRepository.injectVariables(step?.command || '', { targetSystem: mission.targetSystem, objectiveTarget: mission.objectiveTarget }),
                    instructions: missionRepository.injectVariables(step?.instructions || '', { targetSystem: mission.targetSystem, objectiveTarget: mission.objectiveTarget }),
                    isMission: true
                };
            }
            break;

        case MissionStep.CONNECTED:
            const step = steps.find(s => s.type === 'IDENTIFY');
            if (isStepComplete) {
                return {
                    type: 'START_LESSON',
                    lessonId: `LOG_REPAIR_${mission.id}`,
                    nextStep: MissionStep.LOCATED,
                    text: `vim /etc/httpd/conf.d/proxy.conf`,
                    instructions: `ID RECOVERY SUCCESSFUL. FAULT IDENTIFIED: ${mission.objectiveTarget}. FIX THE PROXY CONFIG.`,
                    isMission: true
                };
            } else {
                const nav = StrategyUtils.handleNavigation(mission, state, step?.cwd);
                if (nav) return nav;
            }
            break;

        case MissionStep.LOCATED:
            // No navigation check needed for repair step usually, or could add one
            break;
    }

    return null;
};
