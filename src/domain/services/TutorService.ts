import { TerminalState } from '../entities/TerminalState';
import { Mission, MissionStep } from '../entities/Mission';
import { CommandResponse } from '../entities/Command';
import { IMissionStrategy } from './mission-strategies/IMissionStrategy';
import { MissionRepository } from './MissionRepository';
import { LessonRegistry } from './LessonRegistry';
import { TutorAction, TutorProgressionResult } from '../interfaces/ITutorService';
import { StrategyRegistry } from './mission-strategies/StrategyRegistry';

export { TutorAction, TutorProgressionResult };

/**
 * TutorService - Domain Service
 * 
 * Analyzes the game state and generates context-aware hints for the player.
 * Acts as a core service for the "TutorBot" NPC.
 * 
 * Pillar: The Balanced Scale (SOLID / KISS)
 */
export class TutorService {
    constructor(
        private missionRepository: MissionRepository,
        private lessonRegistry: LessonRegistry,
        private strategyRegistry: StrategyRegistry
    ) { }

    private getStrategy(type: string): IMissionStrategy {
        return this.strategyRegistry.get(type);
    }

    /**
     * Analyzes the current state and mission to determine if a hint is needed.
     */
    public analyzeGameState(mission: Mission, state: TerminalState, lastResponse: CommandResponse): TutorAction | null {
        if (!mission || mission.status !== 'active') return null;
        
        // Unify: Generative missions use TutorBrain for dialogue via Bus.
        if (mission.type === 'generative') return null;

        const strategy = this.getStrategy(mission.type);
        const result = strategy.evaluate(mission, state, lastResponse, this.missionRepository, this.lessonRegistry);
        return result.hint;
    }

    /**
     * Check all active missions for progression.
     */
    public checkMissionProgression(
        state: TerminalState,
        activeMissions: Mission[],
        lastResponse?: CommandResponse
    ): { result: TutorProgressionResult | null, missionId: string } | null {

        for (const mission of activeMissions) {
            if (mission.status !== 'active') continue;

            const strategy = this.getStrategy(mission.type);
            const response = lastResponse || { output: '', exitCode: 0, newState: state } as any;

            const evaluation = strategy.evaluate(mission, state, response, this.missionRepository, this.lessonRegistry);

            if (evaluation.progression) {
                return { result: evaluation.progression, missionId: mission.id };
            }
        }
        return null;
    }
}
