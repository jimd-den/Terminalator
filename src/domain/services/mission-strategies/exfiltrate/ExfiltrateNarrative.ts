import { Mission, MissionStep } from '../../../entities/Mission';
import { TerminalState } from '../../../entities/TerminalState';
import { TutorAction } from '../../../interfaces/ITutorService';
import { MissionNarrator } from '../ComposableTypes';

export const ExfiltrateNarrative: MissionNarrator = (mission, state, isStepComplete) => {
    switch (mission.currentStep) {
        case MissionStep.PENDING:
            if (isStepComplete) {
                return {
                    message: `Connection established. Begin scanning for payload: ${mission.objectiveTarget}`,
                    type: 'HINT',
                    confidence: 1.0
                };
            }
            return {
                message: `Initiate connection: 'ssh admin@${mission.targetSystem}'.`,
                type: 'HINT',
                confidence: 0.5
            };

        case MissionStep.CONNECTED:
            if (isStepComplete) {
                return {
                    message: `Target located. Retrieve it using scp.`,
                    type: 'HINT',
                    confidence: 1.0
                };
            }
            return {
                message: `Scan the filesystem to locate ${mission.objectiveTarget}.`,
                type: 'HINT',
                confidence: 0.7
            };

        case MissionStep.LOCATED:
            if (isStepComplete) {
                return {
                    message: `Payload secured. Mission Accomplished.`,
                    type: 'CONGRATS',
                    confidence: 1.0
                };
            }
            return {
                message: `Extract the payload to your local machine using 'scp'.`,
                type: 'HINT',
                confidence: 0.8
            };

        default:
            return null;
    }
};
