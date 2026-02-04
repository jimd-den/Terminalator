import { Mission, MissionStep } from '../../../entities/Mission';
import { TerminalState } from '../../../entities/TerminalState';
import { CommandResponse } from '../../../entities/Command';
import { MissionInspector } from '../ComposableTypes';

export const DispatcherInspector: MissionInspector = (mission, state, lastResponse) => {
    switch (mission.currentStep) {
        case MissionStep.PENDING:
            return state.fsContext === mission.targetSystem;
        
        case MissionStep.CONNECTED:
            const isDispatch = lastResponse.command?.includes('dispatch');
            return !!(lastResponse.exitCode === 0 && isDispatch);
            
        case MissionStep.LOCATED:
            // For now, dispatcher missions only have one active step after connect
            return true;
            
        default:
            return false;
    }
};
