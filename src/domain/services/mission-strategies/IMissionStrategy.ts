import { TerminalState } from '../../entities/TerminalState';
import { Mission, MissionStep } from '../../entities/Mission';
import { CommandResponse } from '../../entities/Command';
import { TutorAction, TutorProgressionResult } from '../TutorService';
import { MissionRepository } from '../MissionRepository';
import { LessonRegistry } from '../LessonRegistry';

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
}
