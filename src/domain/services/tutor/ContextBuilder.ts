/**
 * ContextBuilder.ts
 *
 * Pillar: THE STORYTELLER’S CODE (Context Aggregation)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Service
 *
 * Intent:
 * Aggregates information from simulation events into a flat UtteranceContext
 * that the UtteranceEngine can use for string interpolation.
 */

import { UtteranceContext } from '../../entities/tutor/TutorTemplate';
import { GameEvent, GameEventType } from '../SimulationBus';

export class ContextBuilder {
    
    /**
     * Extracts relevant variables from a GameEvent.
     */
    public static buildFromEvent(event: GameEvent): UtteranceContext {
        const context: UtteranceContext = {};

        switch (event.type) {
            case GameEventType.COMMAND_EXECUTED:
                context.utility = event.payload.command;
                context.exitCode = event.payload.exitCode;
                context.cwd = event.payload.cwd;
                break;
            
            case GameEventType.REGISTER_MODIFIED:
                context.register = event.payload.register;
                context.oldValue = event.payload.oldValue;
                context.newValue = event.payload.newValue;
                context.utility = 'riscv'; // Contextual utility
                break;
            
            case GameEventType.FILE_ACCESS:
                context.target = event.payload.path;
                context.operation = event.payload.operation;
                break;
        }

        return context;
    }

    /**
     * Merges multiple contexts (e.g., event context + mission context).
     */
    public static merge(base: UtteranceContext, override: UtteranceContext): UtteranceContext {
        return { ...base, ...override };
    }
}
