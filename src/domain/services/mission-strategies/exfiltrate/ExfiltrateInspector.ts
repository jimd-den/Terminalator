import { Mission, MissionStep } from '../../../entities/Mission';
import { TerminalState } from '../../../entities/TerminalState';
import { CommandResponse } from '../../../entities/Command';
import { MissionInspector } from '../ComposableTypes';

export const ExfiltrateInspector: MissionInspector = (mission, state, lastResponse) => {
    switch (mission.currentStep) {
        case MissionStep.PENDING:
            return state.fsContext === mission.targetSystem;
        
        case MissionStep.CONNECTED:
            const isSearchCmd = lastResponse.command?.includes('ls') || lastResponse.command?.includes('find');
            return isSearchCmd && lastResponse.output.includes(mission.objectiveTarget);
            
        case MissionStep.LOCATED:
            return !!(lastResponse.command?.includes('scp') && lastResponse.exitCode === 0);
            
        default:
            return false;
    }
};
