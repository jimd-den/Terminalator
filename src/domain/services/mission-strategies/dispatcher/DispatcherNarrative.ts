import { Mission, MissionStep } from '../../../entities/Mission';
import { TerminalState } from '../../../entities/TerminalState';
import { TutorAction } from '../../../interfaces/ITutorService';
import { MissionNarrator } from '../ComposableTypes';

export const DispatcherNarrative: MissionNarrator = (mission, state, isStepComplete) => {
    switch (mission.currentStep) {
        case MissionStep.PENDING:
            if (isStepComplete) {
                return {
                    missionId: mission.id,
                    message: "Emergency link established. Access the dispatch console.",
                    type: 'HINT',
                    confidence: 1.0
                };
            }
            return {
                missionId: mission.id,
                message: `Establish emergency SATLINK: 'ssh admin@${mission.targetSystem}'.`,
                type: 'HINT',
                confidence: 0.5
            };

        case MissionStep.CONNECTED:
            if (isStepComplete) {
                return {
                    missionId: mission.id,
                    message: "Dispatch successful. Logistics gridlock cleared.",
                    type: 'CONGRATS',
                    confidence: 1.0
                };
            }
            return {
                missionId: mission.id,
                message: `Use the 'dispatch' command to route the units.`,
                type: 'HINT',
                confidence: 0.8
            };

        default:
            return null;
    }
};
