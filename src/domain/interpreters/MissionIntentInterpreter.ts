/**
 * MissionIntentInterpreter.ts - Domain Interpreter
 * 
 * Translates procedural mission grammar into semantic "Intents"
 * that the Tutor system can use for context-aware guidance.
 * 
 * Pillar: THE MASTER'S TOOL (Interpreter Pattern)
 * Pillar: THE STORYTELLER'S CODE (Semantic Intent)
 */

import { Mission } from '../entities/Mission';
import { IMissionVisitor } from '../interfaces/IMissionVisitor';
import { MissionMotive, MissionVerb, MissionNoun } from '../entities/mission/Grammar';

/**
 * Semantic breakdown of what the user is trying to accomplish.
 */
export interface MissionIntent {
    motive: string;
    verb: string;
    noun: string;
    primaryUtility: string;
    targetPath: string;
}

export class MissionIntentInterpreter implements IMissionVisitor<MissionIntent> {
    /**
     * Reads the "gbòǹgbò" (root) logic of a mission.
     */
    public visit(mission: Mission): MissionIntent {
        // 1. Unified Grammar Path
        if (mission.grammar) {
            const lastStep = mission.grammar.steps[mission.grammar.steps.length - 1];
            
            return {
                motive: mission.grammar.archetype,
                verb: mission.metadata?.logic?.verb || 'PROCESS',
                noun: mission.metadata?.logic?.noun || 'DATA',
                primaryUtility: lastStep.commandMatcher.target || 'unknown',
                targetPath: mission.objectiveTarget
            };
        }

        // 2. Legacy Fallback (Metadata path)
        const metadata = mission.metadata;
        if (metadata && metadata.logic) {
            return {
                motive: metadata.logic.motive,
                verb: metadata.logic.verb,
                noun: metadata.logic.noun,
                primaryUtility: metadata.utility,
                targetPath: mission.objectiveTarget
            };
        }

        // 3. Absolute Fallback
        return {
            motive: 'UNKNOWN',
            verb: 'ACCESS',
            noun: 'SYSTEM',
            primaryUtility: 'shell',
            targetPath: mission.objectiveTarget
        };
    }
}