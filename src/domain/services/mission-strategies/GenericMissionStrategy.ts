/**
 * GenericMissionStrategy.ts
 *
 * Pillar: The Four-Fold Shield (Clean Architecture) - Domain Service
 * Pillar: The Balanced Scale (Strategy Pattern)
 *
 * Intent:
 * A data-driven engine that executes any mission defined by a MissionGrammar.
 * It replaces the need for per-archetype logic files.
 *
 * Design Pattern: Strategy
 * Why: To allow the TutorService to evaluate missions using a uniform interface 
 * regardless of whether they are template-based or grammar-based.
 */

import { IMissionStrategy } from './IMissionStrategy';
import { Mission, MissionStep } from '../../entities/Mission';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { TutorAction, TutorProgressionResult } from '../../interfaces/ITutorService';
import { MissionRepository } from '../MissionRepository';
import { LessonRegistry } from '../LessonRegistry';
import { StepRule, CommandMatcher } from '../../entities/mission/MissionGrammar';
import { GameEvent, GameEventType } from '../../services/SimulationBus';
import { SystemPreparationSpec } from '../../entities/world/SystemPreparationSpec';

export class GenericMissionStrategy implements IMissionStrategy {
    
    /**
     * Retrieves the environment requirements for this mission.
     */
    public getPreparationSpec(mission: Mission): SystemPreparationSpec | null {
        return mission.metadata?.prepSpec || null;
    }

    /**
     * Evaluates the current mission state.
     * Note: In a fully event-driven system, this would just check the 
     * mission entity's 'currentStepId' which was updated by a listener.
     */
    public evaluate(
        mission: Mission,
        state: TerminalState,
        lastResponse: CommandResponse,
        missionRepository: MissionRepository,
        lessonRegistry: LessonRegistry
    ): { hint: TutorAction | null; progression: TutorProgressionResult | null } {
        
        if (!mission.grammar) {
            return { hint: null, progression: null };
        }

        const currentStepId = mission.currentStepId || mission.grammar.initialStepId;
        const currentStep = mission.grammar.steps.find(s => s.id === currentStepId);

        if (!currentStep) {
            return { hint: null, progression: null };
        }

        // 1. Check if the LAST command satisfies the current step
        // (This bridges the synchronous Evaluate call from TutorService)
        const isStepSatisfied = this.matchEvent(currentStep.commandMatcher, lastResponse, state);

        if (isStepSatisfied) {
            // Check CWD AFTER matching the command (robustness)
            if (currentStep.cwdPattern) {
                const currentCwd = state.currentDirectory;
                if (!this.smartMatch(currentStep.cwdPattern, currentCwd)) {
                    return {
                        hint: {
                            missionId: mission.id,
                            type: 'HINT',
                            message: `Incorrect location. Navigation required to: ${currentStep.cwdPattern}`,
                            confidence: 1.0,
                            severity: 'WARN'
                        },
                        progression: null
                    };
                }
            }

            return this.handleTransition(mission, currentStep);
        }

        // Return a hint based on the current step's description
        const hint: TutorAction = {
            missionId: mission.id,
            type: 'HINT',
            message: currentStep.description,
            confidence: 1.0,
            severity: 'INFO'
        };

        return { hint, progression: null };
    }

    /**
     * Maps a CommandResponse to a simulated GameEvent for matching.
     */
    private matchEvent(matcher: CommandMatcher, response: CommandResponse, state: TerminalState): boolean {
        // Convert the Response to a Matchable Payload
        if (matcher.type === GameEventType.COMMAND_EXECUTED) {
            const actualCommand = response.command || '';
            // Match Command Name
            if (matcher.target && !this.smartMatch(matcher.target, actualCommand)) {
                return false;
            }
            // Match Output
            if (matcher.expectedValue && !this.smartMatch(String(matcher.expectedValue), response.output)) {
                return false;
            }
            // Match Rule
            if (matcher.ruleKey) {
                return this.evaluateRule(matcher.ruleKey, response, state);
            }
            return true;
        }

        return false;
    }

    /**
     * Performs a smart match supporting literal strings or simple regex patterns.
     */
    private smartMatch(pattern: string, actual: string): boolean {
        if (pattern.startsWith('/') && pattern.endsWith('/')) {
            try {
                const regex = new RegExp(pattern.slice(1, -1), 'i');
                return regex.test(actual);
            } catch (e) {
                return actual.includes(pattern);
            }
        }
        return actual.includes(pattern);
    }

    /**
     * Evaluates complex boolean rules that cannot be expressed as simple string matches.
     */
    private evaluateRule(ruleKey: string, response: CommandResponse, state: TerminalState): boolean {
        switch (ruleKey) {
            case 'SUCCESS_EXIT':
                return response.exitCode === 0;
            case 'HAS_OUTPUT':
                return response.output.trim().length > 0;
            case 'FAILURE_EXIT':
                return response.exitCode !== 0;
            case 'DIR_MATCH':
                return state.currentDirectory === response.metadata?.data?.targetDir;
            default:
                return false;
        }
    }

    /**
     * Handles the transition logic when a step is completed.
     */
    private handleTransition(mission: Mission, currentStep: StepRule): { hint: TutorAction | null; progression: TutorProgressionResult | null } {
        const transition = currentStep.onComplete;
        
        let nextLessonText: string | undefined;
        if (transition?.nextStepId && mission.grammar) {
            const nextStep = mission.grammar.steps.find(s => s.id === transition.nextStepId);
            nextLessonText = nextStep?.lessonText;
        }

        const progression: TutorProgressionResult = {
            type: transition?.nextStepId ? 'START_LESSON' : 'MISSION_COMPLETE',
            message: transition?.tutorIntent || 'Objective reached.',
            nextStep: transition?.nextStepId ? undefined : MissionStep.COMPLETED,
            nextStepId: transition?.nextStepId,
            lessonId: transition?.startLessonId,
            text: nextLessonText,
            objectiveTarget: mission.objectiveTarget,
            isMission: true
        };

        // Update mission state for next evaluation
        if (transition?.nextStepId) {
            mission.currentStepId = transition.nextStepId;
        } else {
            mission.status = 'completed';
        }

        const congratsHint: TutorAction = {
            missionId: mission.id,
            type: 'CONGRATS',
            message: transition?.tutorIntent || 'Well done.',
            confidence: 1.0,
            severity: 'SUCCESS'
        };

        return { hint: congratsHint, progression };
    }
}
