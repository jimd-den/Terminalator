/**
 * CombinatorialUtteranceEngine.ts
 *
 * Pillar: THE STORYTELLER’S CODE (Combinatorial Narrative)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Service
 *
 * Intent:
 * Generates unique dialogue by assembling sentence structures with 
 * variable vocabulary pools. Replaces static template interpolation.
 */

import { TutorIntent } from '../../entities/tutor/TutorIntent';
import { TutorToneProfile } from '../../entities/tutor/TutorToneProfile';
import { TutorTemplate, UtteranceContext } from '../../entities/tutor/TutorTemplate';
import { TutorAction } from '../../interfaces/ITutorService';

export class CombinatorialUtteranceEngine {
    
    // Vocabulary Pools
    private static vocab: Record<string, string[]> = {
        'greeting': ['Hello', 'Greetings', 'Salutations', 'Attention', 'System ready'],
        'affirmative': ['Correct', 'Affirmative', 'Indeed', 'Precisely', 'Confirmed'],
        'negative': ['Incorrect', 'Negative', 'False', 'Error', 'Denied'],
        'connector': ['and', 'additionally', 'furthermore', 'plus', 'also'],
        'emphasis': ['critical', 'vital', 'essential', 'important', 'mandatory']
    };

    /**
     * Generates a unique utterance by filling a structural template with randomized vocabulary.
     */
    public static generate(
        intent: TutorIntent,
        tone: TutorToneProfile,
        context: UtteranceContext,
        templates: TutorTemplate[],
        missionId: string,
        rng: () => number = Math.random
    ): TutorAction {
        
        // 1. Filter by Intent and Tone
        const eligible = templates.filter(t => t.intent === intent && t.tone === tone);

        if (eligible.length === 0) {
            return {
                missionId,
                message: `[SYSTEM: NO STRUCTURE FOR ${intent}:${tone}]`,
                type: 'HINT',
                confidence: 0.1,
                severity: 'INFO'
            };
        }

        // 2. Select Structure
        const selected = eligible[Math.floor(rng() * eligible.length)];

        // 3. Combinatorial Expansion
        const message = this.expand(selected.text, context, rng);

        return {
            missionId,
            message,
            type: this.mapIntentToType(intent),
            confidence: 1.0,
            severity: this.mapIntentToSeverity(intent)
        };
    }

    private static expand(template: string, context: UtteranceContext, rng: () => number): string {
        // Replace {vocab:key} with random word from pool
        let result = template.replace(/{vocab:(\w+)}/g, (match, key) => {
            const pool = this.vocab[key];
            if (!pool) return match;
            return pool[Math.floor(rng() * pool.length)];
        });

        // Standard Context Interpolation
        result = result.replace(/{(\w+)}/g, (match, key) => {
            return String(context[key] ?? match);
        });

        return result;
    }

    private static mapIntentToType(intent: TutorIntent): 'HINT' | 'WARNING' | 'CONGRATS' {
        switch (intent) {
            case TutorIntent.REPRIMAND_MISTAKE: return 'WARNING';
            case TutorIntent.CELEBRATE_SUCCESS: return 'CONGRATS';
            default: return 'HINT';
        }
    }

    private static mapIntentToSeverity(intent: TutorIntent): 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' {
        switch (intent) {
            case TutorIntent.REPRIMAND_MISTAKE: return 'WARN';
            case TutorIntent.CELEBRATE_SUCCESS: return 'SUCCESS';
            case TutorIntent.TOOL_INSTRUCTION: return 'INFO';
            default: return 'INFO';
        }
    }
}
