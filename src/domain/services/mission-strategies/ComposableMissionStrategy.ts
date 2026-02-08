import { IMissionStrategy } from './IMissionStrategy';
import { Mission } from '../../entities/Mission';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { TutorAction, TutorProgressionResult } from '../../interfaces/ITutorService';
import { MissionRepository } from '../MissionRepository';
import { LessonRegistry } from '../LessonRegistry';
import { MissionInspector, MissionNarrator, MissionProgressor } from './ComposableTypes';
import { SystemPreparationSpec } from '../../entities/world/SystemPreparationSpec';

/**
 * ComposableMissionStrategy - Domain Service
 * 
 * A generic strategy implementation that aggregates pure logic functions.
 * Adheres strictly to SRP by separating state inspection, narrative, and progression.
 * 
 * Pillar: SRP / Composition over Inheritance
 */
export class ComposableMissionStrategy implements IMissionStrategy {
    constructor(
        private inspector: MissionInspector,
        private narrator: MissionNarrator,
        private progressor: MissionProgressor
    ) {}

    public getPreparationSpec(mission: Mission): SystemPreparationSpec | null {
        return mission.metadata?.prepSpec || null;
    }

    evaluate(
        mission: Mission,
        state: TerminalState,
        lastResponse: CommandResponse,
        missionRepository: MissionRepository,
        lessonRegistry: LessonRegistry
    ): { hint: TutorAction | null; progression: TutorProgressionResult | null } {
        
        const isStepComplete = this.inspector(mission, state, lastResponse);
        
        const hint = this.narrator(mission, state, isStepComplete);
        const progression = this.progressor(mission, state, lastResponse, isStepComplete, missionRepository);

        return { hint, progression };
    }
}
