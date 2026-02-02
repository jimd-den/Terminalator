import { IMissionStrategy } from './IMissionStrategy';
import { Mission, MissionStep } from '../../entities/Mission';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { TutorAction, TutorProgressionResult } from '../TutorService';
import { MissionRepository } from '../MissionRepository';
import { LessonRegistry } from '../LessonRegistry';
import { StrategyUtils } from './StrategyUtils';

/**
 * DispatcherStrategy - Domain Layer
 * 
 * Archetype: "The Dispatch"
 */
export class DispatcherStrategy implements IMissionStrategy {
    evaluate(
        mission: Mission,
        state: TerminalState,
        lastResponse: CommandResponse,
        missionRepository: MissionRepository,
        lessonRegistry: LessonRegistry
    ): { hint: TutorAction | null; progression: TutorProgressionResult | null } {
        let hint: TutorAction | null = null;
        let progression: TutorProgressionResult | null = null;

        const steps = missionRepository.getStepsForArchetype(mission.type);

        // Step 1: Connect -> Dispatch
        if (mission.currentStep === MissionStep.PENDING) {
            if (state.fsContext === mission.targetSystem) {
                const nextStep = steps.find(s => s.type === 'DISPATCH');

                // [NEW] Check Navigation
                const nav = StrategyUtils.handleNavigation(mission, state, nextStep?.cwd);
                if (nav) return { hint: null, progression: nav };

                progression = {
                    type: 'START_LESSON',
                    lessonId: `DISPATCH_LOOKUP_${mission.id}`,
                    nextStep: MissionStep.CONNECTED,
                    text: missionRepository.injectVariables(nextStep?.command || 'cat /var/db/incidents.csv', { targetSystem: mission.targetSystem, unitId: 'unit-104', incidentId: mission.objectiveTarget }),
                    instructions: missionRepository.injectVariables(nextStep?.instructions || 'READ THE INCIDENT TABLE.', { targetSystem: mission.targetSystem, unitId: 'unit-104', incidentId: mission.objectiveTarget }),
                    isMission: true
                };
                hint = {
                    message: `Incident log accessed. Find the zone for incident ${mission.objectiveTarget}.`,
                    type: 'HINT',
                    confidence: 1.0
                };
            } else {
                hint = {
                    message: `Log in to Dispatch: 'ssh operator@${mission.targetSystem}'.`,
                    type: 'HINT',
                    confidence: 0.5
                };
            }
        }
        // Step 2: Query Available Units
        else if (mission.currentStep === MissionStep.CONNECTED) {
            const step = steps.find(s => s.type === 'DISPATCH');
            if (lastResponse.command?.includes('units.csv')) {
                progression = {
                    type: 'START_LESSON',
                    lessonId: `DISPATCH_COMMAND_${mission.id}`,
                    nextStep: MissionStep.LOCATED,
                    text: missionRepository.injectVariables(step?.command || '', { unitId: 'unit-104', incidentId: mission.objectiveTarget }),
                    instructions: missionRepository.injectVariables(step?.instructions || '', { unitId: 'unit-104', incidentId: mission.objectiveTarget }),
                    isMission: true
                };
                hint = {
                    message: `Route found. Issue the dispatch command to resolve the incident.`,
                    type: 'HINT',
                    confidence: 1.0
                };
            } else {
                // [NEW] Check Navigation
                const nav = StrategyUtils.handleNavigation(mission, state, step?.cwd);
                if (nav) return { hint: null, progression: nav };

                hint = {
                    message: `Incident ${mission.objectiveTarget} is in ZONE_B. Check 'cat /var/db/units.csv' for IDLE units there.`,
                    type: 'HINT',
                    confidence: 0.8
                };
            }
        }

        // Step 3: Complete
        else if (mission.currentStep === MissionStep.LOCATED) {
            if (lastResponse.command?.includes('dispatch') && lastResponse.exitCode === 0) {
                hint = {
                    message: `Unit en route. Scene under control. Mission Accomplished.`,
                    type: 'CONGRATS',
                    confidence: 1.0
                };
            } else {
                hint = {
                    message: lessonRegistry.getDialogue('failure.permission_denied') || `Use the 'dispatch' command to assign the unit. Lives are on the line.`,
                    type: 'HINT',
                    confidence: 0.8
                };
            }
        }

        return { hint, progression };
    }
}
