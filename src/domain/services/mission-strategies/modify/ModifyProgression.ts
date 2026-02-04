import { Mission, MissionStep } from '../../../entities/Mission';
import { TerminalState } from '../../../entities/TerminalState';
import { CommandResponse } from '../../../entities/Command';
import { TutorProgressionResult } from '../../../interfaces/ITutorService';
import { MissionRepository } from '../../MissionRepository';
import { MissionProgressor } from '../ComposableTypes';
import { StrategyUtils } from '../StrategyUtils';

export const ModifyProgression: MissionProgressor = (
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
                const step = steps.find(s => s.type === 'MODIFY');
                
                // Determine CWD based on objective
                let targetCwd = step?.cwd || '/tmp';
                if (mission.objectiveTarget.startsWith('/dev/')) targetCwd = '/dev';
                if (mission.objectiveTarget.startsWith('/var/log')) targetCwd = '/var/log';

                const nav = StrategyUtils.handleNavigation(mission, state, targetCwd);
                if (nav) return nav;

                // For procedural missions, suggest ls first
                const scanCmd = mission.id.startsWith('P-REP') ? 'ls -l' : 'ls -la';

                return {
                    type: 'START_LESSON',
                    lessonId: `MISSION_SCAN_${mission.id}`,
                    objectiveTarget: mission.objectiveTarget,
                    nextStep: MissionStep.CONNECTED,
                    text: missionRepository.injectVariables(scanCmd, mission as any),
                    instructions: missionRepository.injectVariables(step?.instructions || 'NAVIGATE TO TARGET.', mission as any),
                    isMission: true
                };
            }
            break;

        case MissionStep.CONNECTED:
            const step = steps.find(s => s.type === 'MODIFY');
            if (isStepComplete) {
                let text = missionRepository.injectVariables(step?.command || '', mission as any);
                
                // Override for procedural repair
                if (mission.id.startsWith('P-REP')) {
                    text = `echo "ACTIVE" > ${mission.objectiveTarget}`;
                }

                return {
                    type: 'START_LESSON',
                    lessonId: `MISSION_EDIT_${mission.id}`,
                    objectiveTarget: mission.objectiveTarget,
                    nextStep: MissionStep.LOCATED,
                    text: text,
                    instructions: missionRepository.injectVariables(step?.instructions || '', mission as any),
                    isMission: true
                };
            } else {
                let targetCwd = step?.cwd || '/tmp';
                if (mission.objectiveTarget.startsWith('/dev/')) targetCwd = '/dev';
                
                const nav = StrategyUtils.handleNavigation(mission, state, targetCwd);
                if (nav) return nav;
            }
            break;

        case MissionStep.LOCATED:
            const recoverStep = steps.find(s => s.type === 'MODIFY');
            if (!isStepComplete) {
                const nav = StrategyUtils.handleNavigation(mission, state, recoverStep?.cwd);
                if (nav) return nav;
            }
            break;
    }

    return null;
};
