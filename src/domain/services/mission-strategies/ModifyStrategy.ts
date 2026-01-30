import { IMissionStrategy } from './IMissionStrategy';
import { Mission, MissionStep } from '../../entities/Mission';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { TutorAction, TutorProgressionResult } from '../TutorService';

export class ModifyStrategy implements IMissionStrategy {
    evaluate(mission: Mission, state: TerminalState, lastResponse: CommandResponse): { hint: TutorAction | null; progression: TutorProgressionResult | null } {
        let hint: TutorAction | null = null;
        let progression: TutorProgressionResult | null = null;

        // Step 1: Connect
        if (mission.currentStep === MissionStep.PENDING) {
            if (state.fsContext === mission.targetSystem && lastResponse.command?.includes('ssh')) {
                progression = {
                    type: 'START_LESSON',
                    lessonId: `MISSION_SCAN_${mission.id}`,
                    objectiveTarget: mission.objectiveTarget,
                    nextStep: MissionStep.CONNECTED
                };
                hint = {
                    message: `Connection established. Target: ${mission.objectiveTarget}. Begin search.`,
                    type: 'HINT',
                    confidence: 1.0
                };
            } else {
                hint = {
                    message: `Connect to target system: 'ssh admin@${mission.targetSystem}'.`,
                    type: 'HINT',
                    confidence: 0.5
                };
            }
        }

        // Step 2: Locate
        else if (mission.currentStep === MissionStep.CONNECTED) {
            const isSearchCmd = lastResponse.command?.includes('ls') || lastResponse.command?.includes('find');
            if (isSearchCmd && lastResponse.output.includes(mission.objectiveTarget)) {
                progression = {
                    type: 'START_LESSON',
                    lessonId: `MISSION_EDIT_${mission.id}`,
                    objectiveTarget: mission.objectiveTarget,
                    nextStep: MissionStep.LOCATED
                };
                hint = {
                    message: `Target found. Append signature: 'echo "HACKED" >> ${mission.objectiveTarget}'`,
                    type: 'HINT',
                    confidence: 1.0
                };
            } else {
                hint = {
                    message: `Locate the target file '${mission.objectiveTarget}'.`,
                    type: 'HINT',
                    confidence: 0.7
                };
            }
        }

        // Step 3: Complete (Check modification)
        else if (mission.currentStep === MissionStep.LOCATED) {
            // Check if echo or vim was used successfully
            const isModifyCmd = lastResponse.command?.includes('echo') || lastResponse.command?.includes('vim');
            if (lastResponse.exitCode === 0 && isModifyCmd) {
                hint = {
                    message: `Modifications detected. Mission Accomplished. Disconnect immediately.`,
                    type: 'CONGRATS',
                    confidence: 1.0
                };
            } else {
                hint = {
                    message: `Append the signature 'HACKED' to '${mission.objectiveTarget}'.`,
                    type: 'HINT',
                    confidence: 0.8
                };
            }
        }

        return { hint, progression };
    }
}
