import { IMissionStrategy } from './IMissionStrategy';
import { Mission, MissionStep } from '../../entities/Mission';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { TutorAction, TutorProgressionResult } from '../TutorService';

export class ExfiltrateStrategy implements IMissionStrategy {
    evaluate(mission: Mission, state: TerminalState, lastResponse: CommandResponse): { hint: TutorAction | null; progression: TutorProgressionResult | null } {
        let hint: TutorAction | null = null;
        let progression: TutorProgressionResult | null = null;

        // Step 1: Connect
        if (mission.currentStep === MissionStep.PENDING) {
            if (state.fsContext === mission.targetSystem && lastResponse.command?.includes('ssh')) {
                // Progression: Connected!
                progression = {
                    type: 'START_LESSON',
                    lessonId: `MISSION_SCAN_${mission.id}`,
                    objectiveTarget: mission.objectiveTarget,
                    nextStep: MissionStep.CONNECTED
                };

                // We don't advance step here directly, GameManager/TutorService handling the result should do it.
                // But wait, the strategy is stateless logic. The caller needs to update the mission entity.
                // For now, let's assume the caller updates currentStep if progression is returned.
                // Actually, to avoid side effects in evaluate, we should return the NEW STEP too?
                // Or just rely on the fact that if we return START_LESSON, the game manager updates the state.

                hint = {
                    message: `Connection established. Begin scanning for payload: ${mission.objectiveTarget}`,
                    type: 'HINT',
                    confidence: 1.0
                };
            } else {
                if (lastResponse.output.includes('ssh:') || lastResponse.output.includes('Could not resolve')) {
                    hint = {
                        message: `Connection failed. Syntax: 'ssh user@${mission.targetSystem}'.`,
                        type: 'HINT',
                        confidence: 0.9
                    };
                } else {
                    hint = {
                        message: `Initiate connection: 'ssh admin@${mission.targetSystem}'.`,
                        type: 'HINT',
                        confidence: 0.5
                    };
                }
            }
        }

        // Step 2: Locate
        else if (mission.currentStep === MissionStep.CONNECTED) {
            // Check if user found the file (e.g. ls output contains it)
            const isSearchCmd = lastResponse.command?.includes('ls') || lastResponse.command?.includes('find');
            if (isSearchCmd && lastResponse.output.includes(mission.objectiveTarget)) {
                progression = {
                    type: 'START_LESSON',
                    lessonId: `MISSION_SCP_${mission.id}`,
                    objectiveTarget: mission.objectiveTarget,
                    nextStep: MissionStep.LOCATED
                };
                hint = {
                    message: `Target located. Retrieve it: 'scp ${mission.objectiveTarget} ~/'`,
                    type: 'HINT',
                    confidence: 1.0
                };
            } else {
                hint = {
                    message: `Target hidden. Try 'ls' or 'find . -name ${mission.objectiveTarget}'`,
                    type: 'HINT',
                    confidence: 0.7
                };
            }
        }

        // Step 3: Complete (Check local loot)
        else if (mission.currentStep === MissionStep.LOCATED) {
            // Strictly check command output for successful SCP.
            if (lastResponse.command?.includes('scp') && lastResponse.exitCode === 0) {
                hint = {
                    message: `Payload secured. Mission Accomplished.`,
                    type: 'CONGRATS',
                    confidence: 1.0
                };
            } else {
                hint = {
                    message: `Extract the payload to your local machine using 'scp'.`,
                    type: 'HINT',
                    confidence: 0.8
                };
            }
        }

        return { hint, progression };
    }
}
