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

    const getTargetCwd = (stepType: string): string | undefined => {
        const step = steps.find(s => s.type === stepType);
        if (mission.metadata?.searchTerm) {
            return '/var/log';
        }
        return step?.cwd;
    };

    switch (mission.currentStep) {
        case MissionStep.PENDING:
            if (isStepComplete) {
                const step = steps.find(s => s.type === 'IDENTIFY');
                const targetCwd = getTargetCwd('IDENTIFY');
                
                const nav = StrategyUtils.handleNavigation(mission, state, targetCwd);
                if (nav) return nav;

                let command = step?.command || '';
                let instructions = step?.instructions || '';

                if (mission.metadata?.searchTerm) {
                    const targetFile = mission.objectiveTarget;
                    command = `grep "${mission.metadata.searchTerm}" ${targetFile}`;
                    instructions = `SEARCH PROTOCOL INITIATED. LOCATE "${mission.metadata.searchTerm}" IN ${mission.objectiveTarget}.`;
                }

                return {
                    type: 'START_LESSON',
                    lessonId: `LOG_SCAN_${mission.id}`,
                    nextStep: MissionStep.CONNECTED,
                    text: missionRepository.injectVariables(command, { targetSystem: mission.targetSystem, objectiveTarget: mission.objectiveTarget }),
                    instructions: missionRepository.injectVariables(instructions, { targetSystem: mission.targetSystem, objectiveTarget: mission.objectiveTarget }),
                    isMission: true
                };
            }
            break;

        case MissionStep.CONNECTED:
            const step = steps.find(s => s.type === 'IDENTIFY');
            if (isStepComplete) {
                // Determine repair/action command based on objective
                const targetFile = mission.objectiveTarget.startsWith('/') 
                    ? mission.objectiveTarget 
                    : `/var/log/${mission.objectiveTarget}`;

                return {
                    type: 'START_LESSON',
                    lessonId: `LOG_REPAIR_${mission.id}`,
                    nextStep: MissionStep.LOCATED,
                    text: `vim ${targetFile}`,
                    instructions: `TARGET LOCATED: ${mission.objectiveTarget}. COMMENCE ANALYSIS/MODIFICATION.`,
                    isMission: true
                };
            } else {
                const targetCwd = getTargetCwd('IDENTIFY');
                const nav = StrategyUtils.handleNavigation(mission, state, targetCwd);
                if (nav) return nav;
            }
            break;

        case MissionStep.LOCATED:
            // No navigation check needed for repair step usually, or could add one
            break;
    }

    return null;
};
