import { Mission, MissionStep } from '../../../entities/Mission';
import { TerminalState } from '../../../entities/TerminalState';
import { TutorAction } from '../../../interfaces/ITutorService';
import { MissionNarrator } from '../ComposableTypes';

export const LogAnalysisNarrative: MissionNarrator = (mission, state, isStepComplete) => {
    switch (mission.currentStep) {
        case MissionStep.PENDING:
            if (isStepComplete) {
                return {
                    message: "Connection secured. Now locate the fault ID.",
                    type: 'HINT',
                    confidence: 1.0
                };
            }
            return {
                message: `Establish link: 'ssh admin@${mission.targetSystem}'.`,
                type: 'HINT',
                confidence: 0.5
            };

        case MissionStep.CONNECTED:
            if (isStepComplete) {
                return {
                    message: `Fault isolated. Request ID ${mission.objectiveTarget} found. Open the config to fix the route.`,
                    type: 'HINT',
                    confidence: 1.0
                };
            }
            return {
                message: `Scan system for ${mission.objectiveTarget}.`,
                type: 'HINT',
                confidence: 0.8
            };

        case MissionStep.LOCATED:
            if (isStepComplete) {
                return {
                    message: `Infrastructure stabilized. Mission Accomplished.`,
                    type: 'CONGRATS',
                    confidence: 1.0
                };
            }
            return {
                message: `Perform the repair using 'vim'. The infrastructure is counting on you.`,
                type: 'HINT',
                confidence: 0.8
            };

        default:
            return null;
    }
};
