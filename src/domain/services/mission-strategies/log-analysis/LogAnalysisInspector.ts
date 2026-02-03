import { Mission, MissionStep } from '../../../entities/Mission';
import { TerminalState } from '../../../entities/TerminalState';
import { CommandResponse } from '../../../entities/Command';
import { MissionInspector } from '../ComposableTypes';

export const LogAnalysisInspector: MissionInspector = (mission, state, lastResponse) => {
    switch (mission.currentStep) {
        case MissionStep.PENDING:
            return state.fsContext === mission.targetSystem;
        
        case MissionStep.CONNECTED:
            return lastResponse.output.includes(mission.objectiveTarget);
            
        case MissionStep.LOCATED:
            return !!(lastResponse.command?.includes('vim') && lastResponse.exitCode === 0);
            
        default:
            return false;
    }
};
