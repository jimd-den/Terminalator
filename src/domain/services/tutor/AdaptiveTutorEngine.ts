/**
 * AdaptiveTutorEngine.ts
 *
 * Pillar: THE MASTER'S TOOL (Contextual Generation)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Service
 *
 * Intent:
 * Replaces static templates with a dynamic, knowledge-driven dialogue generator.
 * The Tutor constructs sentences by understanding the Command, the Mission, 
 * and the User's History.
 */

import { UnixKnowledgeBase } from '../knowledge/UnixKnowledgeBase';
import { TutorIntent } from '../../entities/tutor/TutorIntent';
import { TutorToneProfile } from '../../entities/tutor/TutorToneProfile';
import { TutorAction } from '../../interfaces/ITutorService';
import { Mission } from '../../entities/Mission';
import { CombinatorialUtteranceEngine } from './CombinatorialUtteranceEngine';
import { INITIAL_TEMPLATE_CATALOG } from '../../data/tutor/TemplateCatalog';

export class AdaptiveTutorEngine {
    constructor(private kb: UnixKnowledgeBase) { }

    public generateAdvice(
        intent: TutorIntent,
        tone: TutorToneProfile,
        mission: Mission,
        lastCommand?: string
    ): TutorAction {
        
        // 1. Mission Context
        const currentStep = mission.grammar?.steps.find(s => s.id === mission.currentStepId);
        
        // 2. Build Context for Combinatorial Engine
        const context: any = {
            target: mission.targetSystem,
            missionId: mission.id,
            reward: mission.reward,
            utility: lastCommand || 'unknown'
        };

        if (currentStep) {
            context.lessonText = currentStep.lessonText;
            context.description = currentStep.description;
        }

        // 3. Delegate to Combinatorial Engine
        return CombinatorialUtteranceEngine.generate(
            intent,
            tone,
            context,
            INITIAL_TEMPLATE_CATALOG,
            mission.id
        );
    }
}
