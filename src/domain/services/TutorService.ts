/**
 * TutorService - Domain Service
 * 
 * Analyzes the game state and generates context-aware hints for the player.
 * Acts as a pure functional core for the "TutorBot" NPC.
 * 
 * Pillar: The Balanced Scale (SOLID / KISS) - Pure Logic
 */

import { TerminalState } from '../entities/TerminalState';
import { Mission, MissionStep } from '../entities/Mission';
import { CommandResponse } from '../entities/Command';

export interface TutorAction {
    message: string;
    type: 'HINT' | 'WARNING' | 'CONGRATS';
    confidence: number; // 0-1
}

/**
 * Analyzes the current state and mission to determine if a hint is needed.
 * @param mission - The active mission the player is tracking.
 * @param state - Current terminal state.
 * @param lastResponse - The result of the last executed command.
 */
import { IMissionStrategy } from './mission-strategies/IMissionStrategy';
import { ExfiltrateStrategy } from './mission-strategies/ExfiltrateStrategy';
import { ModifyStrategy } from './mission-strategies/ModifyStrategy';

const strategies: Record<string, IMissionStrategy> = {
    'exfiltrate': new ExfiltrateStrategy(),
    'modify': new ModifyStrategy()
};

function getStrategy(type: string): IMissionStrategy {
    return strategies[type] || strategies['exfiltrate']; // Default fallback
}

export function analyzeGameState(mission: Mission, state: TerminalState, lastResponse: CommandResponse): TutorAction | null {
    if (!mission || mission.status !== 'active') return null;
    const strategy = getStrategy(mission.type);
    const result = strategy.evaluate(mission, state, lastResponse);
    return result.hint;
}

export interface TutorProgressionResult {
    type: 'START_LESSON';
    lessonId: string;
    objectiveTarget?: string;
    nextStep?: MissionStep; // [NEW] State transition
}

export function checkMissionProgression(
    state: TerminalState,
    activeMissions: Mission[],
    _prevFsContext?: string, // Legacy param, not needed with state strategy
    lastResponse?: CommandResponse // [NEW] We need this for strategy eval
): { result: TutorProgressionResult | null, missionId: string } | null {

    // Check all active missions for progression
    for (const mission of activeMissions) {
        if (mission.status !== 'active') continue;

        const strategy = getStrategy(mission.type);
        // We pass a dummy response if none provided, but really checkMissionProgression should be called with response
        // fixing caller in GameManager is key.
        const response = lastResponse || { output: '', exitCode: 0, newState: state } as any;

        const evaluation = strategy.evaluate(mission, state, response);

        if (evaluation.progression) {
            return { result: evaluation.progression, missionId: mission.id };
        }
    }
    return null;
}
