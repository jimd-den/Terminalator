/**
 * MissionIntentInterpreter.ts - Domain Interpreter
 * 
 * Translates procedural mission metadata into semantic "Intents"
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
    motive: MissionMotive;
    verb: MissionVerb;
    noun: MissionNoun;
    primaryUtility: string;
    targetPath: string;
}

export class MissionIntentInterpreter implements IMissionVisitor<MissionIntent> {
    /**
     * Reads the "gbòǹgbò" (root) logic of a mission.
     */
    public visit(mission: Mission): MissionIntent {
        const metadata = mission.metadata;
        
        // Ensure we are dealing with a procedural mission
        if (!metadata || !metadata.logic) {
            // Fallback for legacy archetypes if necessary, or throw
            throw new Error("Interpretation Failure: Mission lacks combinatorial logic metadata.");
        }

        return {
            motive: metadata.logic.motive,
            verb: metadata.logic.verb,
            noun: metadata.logic.noun,
            primaryUtility: metadata.utility,
            targetPath: mission.objectiveTarget
        };
    }
}
