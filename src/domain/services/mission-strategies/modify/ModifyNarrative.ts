import { Mission, MissionStep } from '../../../entities/Mission';
import { TerminalState } from '../../../entities/TerminalState';
import { TutorAction } from '../../../interfaces/ITutorService';
import { MissionNarrator } from '../ComposableTypes';

export const ModifyNarrative: MissionNarrator = (mission, state, isStepComplete) => {
    switch (mission.currentStep) {
        case MissionStep.PENDING:
            if (isStepComplete) {
                return {
                    message: `Connection established. Target: ${mission.objectiveTarget}. Begin search.`,
                    type: 'HINT',
                    confidence: 1.0
                };
            }
            return {
                message: `Connect to target system: 'ssh admin@${mission.targetSystem}'.`,
                type: 'HINT',
                confidence: 0.5
            };

        case MissionStep.CONNECTED:
            if (isStepComplete) {
                return {
                    message: `Target found. Apply the designated changes to ${mission.objectiveTarget}.`,
                    type: 'HINT',
                    confidence: 1.0
                };
            }
            return {
                message: `Locate the target file '${mission.objectiveTarget}'.`,
                type: 'HINT',
                confidence: 0.7
            };

        case MissionStep.LOCATED:
            if (isStepComplete) {
                return {
                    message: `Modifications detected. Mission Accomplished.`,
                    type: 'CONGRATS',
                    confidence: 1.0
                };
            }
            return {
                message: `Modify the target file '${mission.objectiveTarget}'.`,
                type: 'HINT',
                confidence: 0.8
            };

        default:
            return null;
    }
};
