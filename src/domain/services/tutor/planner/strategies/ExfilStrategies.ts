/**
 * ExfilStrategies.ts - Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Exfiltration Action Strategies
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ICommandStrategy } from '../ICommandStrategy';
import { PlannerState } from '../IPlannerAction';
import { KnowledgeType } from '../../../../entities/knowledge/KnowledgeEntity';
import { TutorKnowledgeBase } from '../../../../entities/knowledge/TutorKnowledgeBase';

/**
 * Strategy to read the contents of a discovered file.
 */
export class ReadFileStrategy implements ICommandStrategy {
    public readonly name = "ReadFile";
    public readonly cost = 2;

    public isSatisfiedBy(state: PlannerState): boolean {
        return state.knownTypes.has(KnowledgeType.PATH);
    }

    public applyEffects(state: PlannerState): PlannerState {
        const nextTypes = new Set(state.knownTypes);
        nextTypes.add(KnowledgeType.METADATA);
        return {
            ...state,
            knownTypes: nextTypes
        };
    }

    public generateCommand(kb: TutorKnowledgeBase): string {
        const paths = kb.recall(KnowledgeType.PATH);
        // Pick the most recently discovered path, or a heuristic choice
        const target = paths.length > 0 ? paths[paths.length - 1].value : "/etc/hostname";
        return `cat ${target}`;
    }
}

/**
 * Strategy to search for specific strings within files.
 */
export class GrepContentStrategy implements ICommandStrategy {
    public readonly name = "GrepContent";
    public readonly cost = 3;

    public isSatisfiedBy(state: PlannerState): boolean {
        return state.knownTypes.has(KnowledgeType.PATH);
    }

    public applyEffects(state: PlannerState): PlannerState {
        const nextTypes = new Set(state.knownTypes);
        nextTypes.add(KnowledgeType.METADATA);
        nextTypes.add(KnowledgeType.CREDENTIAL);
        return {
            ...state,
            knownTypes: nextTypes
        };
    }

    public generateCommand(kb: TutorKnowledgeBase): string {
        const paths = kb.recall(KnowledgeType.PATH);
        const target = paths.length > 0 ? paths[paths.length - 1].value : "/var/log";
        return `grep -ri "password" ${target} 2>/dev/null`;
    }
}
