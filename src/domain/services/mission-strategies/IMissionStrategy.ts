import { TerminalState } from '../../entities/TerminalState';
import { Mission, MissionStep } from '../../entities/Mission';
import { CommandResponse } from '../../entities/Command';
import { TutorAction, TutorProgressionResult } from '../../interfaces/ITutorService';
import { MissionRepository } from '../MissionRepository';
import { LessonRegistry } from '../LessonRegistry';
import { SystemPreparationSpec } from '../../entities/world/SystemPreparationSpec';

export interface IMissionStrategy {
    evaluate(
        mission: Mission,
        state: TerminalState,
        lastResponse: CommandResponse,
        missionRepository: MissionRepository,
        lessonRegistry: LessonRegistry
    ): {
        hint: TutorAction | null;
        progression: TutorProgressionResult | null;
    };

    getPreparationSpec(mission: Mission): SystemPreparationSpec | null;
}
