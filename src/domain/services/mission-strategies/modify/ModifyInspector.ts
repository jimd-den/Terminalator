import { Mission, MissionStep } from '../../../entities/Mission';
import { TerminalState } from '../../../entities/TerminalState';
import { CommandResponse } from '../../../entities/Command';
import { MissionInspector } from '../ComposableTypes';

export const ModifyInspector: MissionInspector = (mission, state, lastResponse) => {
    switch (mission.currentStep) {
        case MissionStep.PENDING:
            return state.fsContext === mission.targetSystem;
        
        case MissionStep.CONNECTED:
            // Check if file or device exists in output
            const isSearchCmd = lastResponse.command?.includes('ls') || lastResponse.command?.includes('find');
            const targetName = mission.objectiveTarget.split('/').pop() || mission.objectiveTarget;
            return !!(isSearchCmd && lastResponse.output.includes(targetName));
            
        case MissionStep.LOCATED:
            // Check for file modification or device reset
            const isEcho = lastResponse.command?.includes('echo');
            const isTargetMatch = lastResponse.command?.includes(mission.objectiveTarget);
            
            // If it's a procedural reset, we look for the state being set
            if (mission.id.startsWith('P-REP')) {
                return !!(lastResponse.exitCode === 0 && isEcho && isTargetMatch);
            }
            
            // Legacy template check
            const isModifyCmd = isEcho || lastResponse.command?.includes('>>') || lastResponse.command?.includes('vim');
            return !!(lastResponse.exitCode === 0 && isModifyCmd && isTargetMatch);
            
        default:
            return false;
    }
};
