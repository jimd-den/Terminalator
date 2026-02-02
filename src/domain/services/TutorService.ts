import { TerminalState } from '../entities/TerminalState';
import { Mission, MissionStep } from '../entities/Mission';
import { CommandResponse } from '../entities/Command';
import { IMissionStrategy } from './mission-strategies/IMissionStrategy';
import { ExfiltrateStrategy } from './mission-strategies/ExfiltrateStrategy';
import { ModifyStrategy } from './mission-strategies/ModifyStrategy';
import { LogAnalysisStrategy } from './mission-strategies/LogAnalysisStrategy';
import { DispatcherStrategy } from './mission-strategies/DispatcherStrategy';
import { MissionRepository } from './MissionRepository';
import { LessonRegistry } from './LessonRegistry';

export interface TutorAction {
    message: string;
    type: 'HINT' | 'WARNING' | 'CONGRATS';
    confidence: number; // 0-1
}

export interface TutorProgressionResult {
    type: 'START_LESSON';
    lessonId: string;
    objectiveTarget?: string;
    nextStep?: MissionStep;
    text?: string;        // [NEW] Dynamic command for the lesson
    instructions?: string; // [NEW] Narrative instructions
    isMission?: boolean;   // [NEW] Carry mission context
}

/**
 * TutorService - Domain Service
 * 
 * Analyzes the game state and generates context-aware hints for the player.
 * Acts as a core service for the "TutorBot" NPC.
 * 
 * Pillar: The Balanced Scale (SOLID / KISS)
 */
export class TutorService {
    private strategies: Record<string, IMissionStrategy> = {
        'exfiltrate': new ExfiltrateStrategy(),
        'modify': new ModifyStrategy(),
        'log-analysis': new LogAnalysisStrategy(),
        'dispatcher': new DispatcherStrategy()
    };

    constructor(
        private missionRepository: MissionRepository,
        private lessonRegistry: LessonRegistry
    ) { }

    private getStrategy(type: string): IMissionStrategy {
        return this.strategies[type] || this.strategies['exfiltrate'];
    }

    /**
     * Analyzes the current state and mission to determine if a hint is needed.
     */
    public analyzeGameState(mission: Mission, state: TerminalState, lastResponse: CommandResponse): TutorAction | null {
        if (!mission || mission.status !== 'active') return null;
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
