import { TerminalState } from '../../entities/TerminalState';
import { Mission, MissionStep } from '../../entities/Mission';
import { CommandResponse } from '../../entities/Command';
import { TutorAction, TutorProgressionResult } from '../TutorService';

export interface IMissionStrategy {
    evaluate(mission: Mission, state: TerminalState, lastResponse: CommandResponse): {
        hint: TutorAction | null;
        progression: TutorProgressionResult | null;
    };
}
