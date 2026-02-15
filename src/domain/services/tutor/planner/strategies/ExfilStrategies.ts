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
    public readonly cost = 15;

    public isSatisfiedBy(state: PlannerState): boolean {
        const hasPath = state.knownTypes.has(KnowledgeType.PATH);
        const hasMeta = state.knownTypes.has(KnowledgeType.METADATA);
        const notLocal = state.currentHost !== 'terminalator';
        const satisfied = hasPath && hasMeta && notLocal;
        console.log(`[ReadFileStrategy] isSatisfied: ${satisfied}. hasPath: ${hasPath}, hasMeta: ${hasMeta}, currentHost: ${state.currentHost}`);
        return satisfied;
    }

    public applyEffects(state: PlannerState): PlannerState {
        const nextTypes = new Set(state.knownTypes);
        nextTypes.add(KnowledgeType.MISSION_OBJECTIVE);
        
        const nextValues = new Set(state.knownValues);
        nextValues.add(`MISSION_DATA_ACQUIRED`);

        return {
            ...state,
            knownTypes: nextTypes,
            knownValues: nextValues,
            currentHost: state.currentHost
        };
    }

    public generateCommand(kb: TutorKnowledgeBase, goalHost?: string): string {
        const paths = kb.recall(KnowledgeType.PATH);
        // Find path on target host
        const target = paths.find(p => p.metadata?.host === goalHost)?.value || "/var/data/target";
        return `cat ${target}`;
    }
}

/**
 * Strategy to search for specific strings within files.
 */
export class GrepContentStrategy implements ICommandStrategy {
    public readonly name = "GrepContent";
    public readonly cost = 20;

    public isSatisfiedBy(state: PlannerState): boolean {
        const hasPath = state.knownTypes.has(KnowledgeType.PATH);
        const notLocal = state.currentHost !== 'terminalator';
        const satisfied = hasPath && notLocal;
        console.log(`[GrepContentStrategy] isSatisfied: ${satisfied}. hasPath: ${hasPath}, currentHost: ${state.currentHost}`);
        return satisfied;
    }

    public applyEffects(state: PlannerState): PlannerState {
        const nextTypes = new Set(state.knownTypes);
        nextTypes.add(KnowledgeType.METADATA);
        
        const nextValues = new Set(state.knownValues);
        nextValues.add(`CONTENT_SEARCHED`);

        return {
            ...state,
            knownTypes: nextTypes,
            knownValues: nextValues,
            currentHost: state.currentHost
        };
    }

    public generateCommand(kb: TutorKnowledgeBase, goalHost?: string): string {
        return `grep -r admin /`;
    }
}
