import { Mission } from '../../entities/Mission';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { TutorAction, TutorProgressionResult } from '../../interfaces/ITutorService';

import { MissionRepository } from '../MissionRepository';

/**
 * Types for composable mission evaluation logic.
 */

export type MissionInspector = (
    mission: Mission,
    state: TerminalState,
    lastResponse: CommandResponse
) => boolean;

export type MissionNarrator = (
    mission: Mission,
    state: TerminalState,
    isComplete: boolean
) => TutorAction | null;

export type MissionProgressor = (
    mission: Mission,
    state: TerminalState,
    lastResponse: CommandResponse,
    isComplete: boolean,
    missionRepository: MissionRepository
) => TutorProgressionResult | null;
